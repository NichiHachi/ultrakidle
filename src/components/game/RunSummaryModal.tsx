import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import { resolveExternalUrl } from "../../lib/urls";

interface Round {
  round_number: number;
  score: number;
  public_image_url: string;
  time_spent_seconds: number;
  submitter: {
    discord_name: string;
    discord_avatar_url: string;
  };
  correct_level: {
    level_number: string | number;
  };
  guessed_level?: {
    level_number: string | number;
  };
}

interface RunSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string | number | null;
}

const RunSummaryModal = ({ isOpen, onClose, runId }: RunSummaryModalProps) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && runId) {
      fetchRunRounds();
    }
  }, [isOpen, runId]);

  const fetchRunRounds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ig_cybergrind_rounds")
        .select(
          `
          round_number,
          score,
          public_image_url,
          time_spent_seconds,
          submitter:submitter_profiles(discord_name, discord_avatar_url),
          correct_level:levels!ig_cybergrind_rounds_correct_level_id_fkey(level_number),
          guessed_level:levels!guessed_level_id(level_number)
        `
        )
        .eq("run_id", runId)
        .not("completed_at", "is", null)
        .order("round_number", { ascending: true });

      if (error) throw error;
      setRounds(data as unknown as Round[]);
    } catch (error) {
      console.error("Error fetching rounds:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        showCloseButton={false}
        title="RUN SUMMARY"
        footerButtonText="CLOSE"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col gap-4 my-4">
        {loading ? (
            <div className="py-12 flex flex-col items-center justify-center border border-white/5 bg-white/[0.02]">
              <p className="text-white/50 uppercase text-sm animate-pulse tracking-widest">
                Retrieving run data...
              </p>
            </div>
          ) : rounds.length === 0 ? (
            <div className="text-white/30 uppercase italic text-sm py-4 text-center tracking-widest">
              NO COMPLETED ROUNDS FOUND.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rounds.map((round) => (
                <div
                  key={round.round_number}
                  className="border border-white/10 p-3 flex flex-col gap-3 bg-white/[0.02]"
                >
                  <div className="flex justify-between items-center text-sm text-white/30 uppercase tracking-widest">
                    <span>Wave {round.round_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/30 uppercase">
                      Captured by
                    </span>
                    <div className="flex items-center gap-1.5">
                      {round.submitter?.discord_avatar_url && (
                        <img
                          src={round.submitter.discord_avatar_url}
                          alt=""
                          className="w-4 h-4 rounded-full border border-white/10"
                        />
                      )}
                      <span className="text-sm text-white/50 font-bold">
                        {round.submitter?.discord_name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="aspect-video border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-colors"
                  >
                    <img
                      src={resolveExternalUrl(round.public_image_url)}
                      alt={`Round ${round.round_number} snapshot`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 uppercase">Time</span>
                      <span className="font-bold text-white/70 uppercase">
                        {round.time_spent_seconds
                          ? Number(round.time_spent_seconds).toFixed(3)
                          : "0.000"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 uppercase">Target</span>
                      <span className="font-bold text-green-400 uppercase truncate max-w-[120px]">
                        {round.correct_level?.level_number || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 uppercase">Guess</span>
                      <span
                        className={`font-bold ${
                          round.score === 100
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {round.guessed_level?.level_number || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            className="max-w-full max-h-full object-contain border border-white/10 shadow-2xl"
            alt="Enlarged view"
          />
        </div>
      )}
    </>
  );
};

export default RunSummaryModal;
