import { useState } from "react";
import Modal from "./ui/Modal";
import { ExternalLink } from "./ui/ExternalLink";

const DogHelpPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-green-500/10 border-2 border-green-500/20 w-fit">
      <span className="text-sm text-green-400 font-medium">
        Update on Celeste: She's going to be okay!{" "}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="underline hover:text-green-300 transition-colors cursor-pointer font-bold"
        >
          Read more
        </button>
      </span>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="UPDATE ON CELESTE"
        maxWidth="max-w-xl"
        footerButtonText="DISMISS"
      >
        <div className="space-y-4 tracking-tight">
          <p>
            Hi everyone, creator of ULTRAKIDLE here with a positive update on{" "}
            <span className="text-white font-bold">Celeste</span>, my German
            Shepherd companion since ~July 2018 who has recently been sick.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <img src="/images/celeste-1.jpeg" />
            <img src="/images/celeste-2.gif" />
            <img src="/images/celeste-3.jpeg" />
          </div>
          <p>
            The vet talked to us and the whole picture is a lot more clear and
            way less alarming now. The support I've received has been enough to
            cover all expenses (even those yet to come!) regarding Celeste's
            recovery.
          </p>
          <div className="bg-green-500/10 border-2 border-green-500/30 p-4">
            <p className="text-green-400 font-bold mb-2">THANK YOU!</p>
            <p className="text-white/70">
              I am more grateful than what a simple message can express. Thank
              you so much to everyone who donated and shared the link. A more
              detailed update will follow through the V-Mail Terminal soon when we start noticing the first signs of visible progress
            </p>
          </div>
          <div className="bg-blue-500/10 border-2 border-blue-500/30 p-4">
            <p className="text-blue-400 font-bold mb-2">
              DONATIONS ARE NO LONGER NEEDED FOR THIS, BUT:
            </p>
            <ul className="list-disc pl-4 space-y-2 text-white/70">
              <li>
                You can still{" "}
                <ExternalLink
                  href="https://ko-fi.com/ikz87"
                  className="text-white underline hover:text-blue-300 transition-colors"
                >
                  support on ko-fi
                </ExternalLink>
                &nbsp;if you enjoy the game (You will be shown in the donors
                board as usual)
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DogHelpPrompt;
