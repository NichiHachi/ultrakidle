import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { MESSAGES } from '../lib/messages';
import type { Message } from '../lib/messages';
import { supabase } from '../lib/supabaseClient';

interface MessagesContextType {
    unreadMessages: Message[];
    allMessages: Message[];
    readMessages: Message[];
    hasUnread: boolean;
    loading: boolean;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ultrakilldle_read_messages';

export const MessagesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [readIds, setReadIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Initial load from LocalStorage (fast)
    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                setReadIds(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse read messages from localStorage', e);
            }
        }
    }, []);

    // 2. Sync with Supabase on mount and auth state change
    useEffect(() => {
        const syncWithSupabase = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('MessagesContext: Syncing with Supabase. Session:', session?.user?.id);

            if (!session?.user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('read_messages')
                .select('message_id')
                .eq('user_id', session.user.id);

            if (error) {
                console.error('MessagesContext: Supabase error:', error);
            }

            if (!error && data) {
                const supabaseIds = data.map(row => row.message_id);
                console.log('MessagesContext: Fetched read IDs from Supabase:', supabaseIds);
                setReadIds(prev => {
                    const combined = Array.from(new Set([...prev, ...supabaseIds]));
                    console.log('MessagesContext: Final readIds state:', combined);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
                    return combined;
                });
            }
            setLoading(false);
        };

        syncWithSupabase();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            syncWithSupabase();
        });

        return () => subscription.unsubscribe();
    }, []);

    const markAsRead = async (id: string) => {
        // Optimistic local update
        setReadIds((prev) => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
            return next;
        });

        // Persistent server update if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await supabase
                .from('read_messages')
                .upsert({ user_id: session.user.id, message_id: id }, { onConflict: 'user_id,message_id' });
        }
    };

    const markAllAsRead = async () => {
        const allIds = MESSAGES.map(m => m.id);
        setReadIds(allIds);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allIds));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const rows = allIds.map(id => ({ user_id: session.user.id, message_id: id }));
            await supabase.from('read_messages').upsert(rows, { onConflict: 'user_id,message_id' });
        }
    };

    const unreadMessages = MESSAGES.filter(m => !readIds.includes(m.id));
    const readMessages = MESSAGES.filter(m => readIds.includes(m.id));
    const hasUnread = unreadMessages.length > 0;

    return (
        <MessagesContext.Provider
            value={{
                unreadMessages,
                allMessages: MESSAGES,
                readMessages,
                hasUnread,
                loading,
                markAsRead,
                markAllAsRead,
            }}
        >
            {children}
        </MessagesContext.Provider>
    );
};

export const useMessages = () => {
    const context = useContext(MessagesContext);
    if (context === undefined) {
        throw new Error('useMessages must be used within a MessagesProvider');
    }
    return context;
};
