import type { ReactNode } from 'react';

export interface Message {
    id: string;
    content: ReactNode;
    date?: string;
}

export const MESSAGES: Message[] = [
    {
        id: 'infernoguessr-submission',
        date: '2026-03-11',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
    <p className="text-white lg:text-base text-sm">
      NEW CHALLENGE APPROACHING:{" "}
      <span className="text-red-500">INFERNOGUESSR</span>
      <br />
      (accepting submissions!)
    </p>
    <p className="text-cyan-300 lg:text-base text-sm">
      Wanna help development while ALSO getting credited in this website?
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      Hey all, I've been busy with IRL stuff but I've had this idea in
      mind to implement different gamemodes; one of these being
      InfernoGuessr (GeoGuessr for ULTRAKILL). Basically you'd have to
      guess a given level from a single screenshot taken in that level.
      Specifics of how exactly this will work are still TBD.
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      For this to be possible, I'd need <em>quite</em> the amount of
      screenshots, an amount I cannot gather alone. That's why I have
      opened community submissions!
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      Want to participate in sending images and/or voting which images
      get in? Join the{" "}
      <a
        className="text-indigo-500 underline"
        href="https://discord.gg/6dsMavu6mH"
      >
        official ULTRAKIDLE discord server
      </a>{" "}
      and check the{" "}
      <span className="bg-indigo-900/50 rounded-sm px-1">
        #infernoguessr-submissions
      </span>{" "}
      forum!
    </p>
    <p className="text-white/70 lg:text-base text-sm">
        When the gamemode goes live, whenever your image appears in the game, it will be credited to your discord tag/nickname at time of submission approval.
    </p>
  </div>
        ),
    },
    {
        id: 'discord-invite',
        date: '2026-03-09',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
                <p className="text-zinc-400 text-sm">NETWORK INVITE</p>
                <p className="text-white/70 lg:text-base text-sm">
                    Hello machines, may I interest you in joining the <a className="text-indigo-500 underline" href="https://discord.gg/6dsMavu6mH">official ULTRAKIDLE discord server</a>?
                </p>
                <p className="text-white/70 lg:text-base text-sm">
                    You can do it right here but I also changed the DISCORD link in the footer of the site, previously it pointed to my personal discord profile, now it goes to the invite link for the official server.
                </p>
                <p className="text-white/70 lg:text-base text-sm">
                    That's all, have fun!
                </p>
            </div>
        ),
    },
    {
        id: 'v-mail-update',
        date: '2026-03-09',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
                <p className="text-zinc-400 text-sm">SYSTEM UPDATE LOG // [09-MAR-2026]</p>
                <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                    <li>Integrated V-MAIL interface.</li>
                </ul>
            </div>
        ),
    },
];
