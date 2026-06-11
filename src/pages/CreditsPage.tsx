import SEO from '../components/SEO';
import { toExternalUrl } from '../lib/urls';
import { ExternalLink } from '../components/ui/ExternalLink';

const CreditsPage = () => {
    const contributors = [
        { name: "NichiHachi", url: "https://github.com/NichiHachi" }
    ];

    const attributions = [
        {
            label: "Party hat icon",
            link: "https://www.flaticon.com/free-stickers/party-hat",
            author: "Ina Mella - Flaticon",
            title: "party hat stickers"
        }
    ];

    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="Credits" description="Credits and attributions for the ULTRAKIDLE project." />
            <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h1 className="text-3xl text-white">SYSTEM_CREDITS</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* CREATOR SECTION */}
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl opacity-50">CREATOR</h2>
                        <div className="bg-white/5 border border-white/5 p-4 flex flex-col gap-1">
                            <span className="text-3xl text-white">ikz87</span>
                            <ExternalLink
                                href="mailto:iikz87ii@gmail.com"
                                className="text-sm text-indigo-500 hover:text-red-400 transition-colors underline lowercase tracking-normal font-normal"
                            >
                                iikz87ii@gmail.com
                            </ExternalLink>
                        </div>
                    </div>

                    {/* DATA SOURCE SECTION */}
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl opacity-50">DATA_SOURCE</h2>
                        <div className="bg-white/5 border border-white/5 p-4 flex flex-col justify-center h-full">
                            <ExternalLink
                                href={toExternalUrl("/external/wiki/")}
                                className="text-3xl text-red-500 hover:text-red-400 transition-colors underline"
                            >
                                ULTRAwiki
                            </ExternalLink>
                        </div>
                    </div>

                    {/* CONTRIBUTIONS SECTION */}
                    <div className="flex flex-col gap-2 col-span-2">
                        <h2 className="text-xl opacity-50">CONTRIBUTIONS</h2>
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                            {contributors.map((person) => (
                                <ExternalLink
                                    key={person.name}
                                    href={person.url}
                                    className="flex items-center justify-center bg-white/5 border border-white/5 p-3 hover:bg-white/10 hover:border-white/20 transition-all group"
                                >
                                    <span className="text-white group-hover:text-indigo-400">{person.name}</span>
                                </ExternalLink>
                            ))}
                        </div>
                    </div>

                    {/* ATTRIBUTIONS SECTION */}
                    <div className="flex flex-col gap-2 col-span-2">
                        <h2 className="text-xl opacity-50">ATTRIBUTIONS</h2>
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                            {attributions.map((attr, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 p-3 flex flex-col gap-1">
                                    <span className="text-xs text-white/70">{attr.label}</span>
                                    <ExternalLink
                                        href={attr.link}
                                        title={attr.title}
                                        className="text-[10px] text-indigo-400 hover:underline normal-case font-normal tracking-normal"
                                    >
                                        Created by {attr.author}
                                    </ExternalLink>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex flex-col gap-2">
                    <span className="text-[10px] opacity-30 font-normal normal-case tracking-normal">
                        ALL RIGHTS TO ULTRAKILL BELONG TO ARSI "HAKITA" PATALA AND NEW BLOOD INTERACTIVE.
                    </span>
                    <span className="text-[10px] opacity-30 font-normal normal-case tracking-normal">
                        THIS PROJECT IS A FAN-MADE TRIBUTE AND IS NOT AFFILIATED WITH THE ORIGINAL CREATORS.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CreditsPage;
