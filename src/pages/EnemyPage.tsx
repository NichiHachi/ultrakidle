import { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { resolveExternalUrl } from '../lib/urls';
import { toExternalUrl } from '../lib/urls';
import { isRunningInDiscord, discordSdk } from '../lib/discord';
import { Typewriter } from "../components/Typewriter";
import { vh } from 'framer-motion';

interface Enemy {
  id: number,
  name: string,
  full_body_url: string,
  wiki_link: string,
  enemy_type: string,
  weight_class: string,
  health: number,
  first_appearance: string,
  is_boss: boolean
}

interface Level {
  id: number,
  level_number: number;
  level_name: string;
  thumbnail_url: string;
  wiki_url: string;
}

const EnemyPage = () => {
  const { enemy } = useParams();
  const [enemyData, setEnemyData] = useState<Enemy | null>(null);
  const [levelDataList, setLevelDataList] = useState<Level[] | null>(null);


  function capitalize(word: string) {
    return word.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string
  ) => {
    if (isRunningInDiscord() && discordSdk) {
      e.preventDefault();
      discordSdk.commands.openExternalLink({ url: toExternalUrl(url) });
    }
  };

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {

      // Get the enemy data
      const { data: enemyData, error: enemyError } = await supabase
        .from("ultrakill_enemies")
        .select("id, name, full_body_url, wiki_link, enemy_type, weight_class, health, first_appearance, is_boss")
        .eq("id", enemy)
        .single();

      if (enemyError && enemyError.message.includes("CLIENT_OUTDATED")) return;
      if (ignore) return;

      setEnemyData(enemyData);

      // Get the level where the enemy is apprearing
      const { data: levelIdsData, error: levelIdsError } = await supabase
        .from("level_enemies")
        .select("level_id")
        .eq("enemy_id", enemyData!.id);

      if (levelIdsError && levelIdsError.message.includes("CLIENT_OUTDATED")) return;
      if (ignore) return;

      // Convert the hashmap containing only one value to a list
      const levelIds = levelIdsData!.map(item => item.level_id);

      // Get the level data
      const { data: levelData, error: levelError } = await supabase
        .from("levels")
        .select("id, level_number, level_name, thumbnail_url, wiki_url")
        .in("id", levelIds)
        .order("order_index");

      if (levelError && levelError.message.includes("CLIENT_OUTDATED")) return;
      if (ignore) return;

      setLevelDataList(levelData);
    };

    fetchData();
    return () => { ignore = true; };
  }, [setEnemyData, setLevelDataList, enemy]);

  return (
    <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
      <style>
        {`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .fade-in {
            opacity: 0;
            animation: fade-in 1s ease forwards;
          }
        `}
      </style>
      <SEO title="Enemy detail" description="A detail description of the selected enemy in ULTRAKILL with their stats." />
      <div className="flex flex-col w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 font-bold tracking-widest">
        <div className="flex justify-between flex-wrap items-center border-b border-white/10 pb-4 mb-6" >
          <h1 className="text-3xl text-white uppercase">ENEMY_DETAIL</h1>
          <span className="text-sm opaimageimagecity-50 tracking-normal  font-normal uppercase">
            {(enemyData == null ? 0 : 6) + (levelDataList == null ? 0 : levelDataList?.length) + 1} ENTRIES FOUND
          </span>
        </div>
        {
          enemyData != null && (
            <div>
              <div className='h-8 flex items-center'
                style={{
                  backgroundColor: "#9b2221",
                  borderTopRightRadius: "0.5rem",
                  borderTopLeftRadius: "0.5rem",
                }}
              >
                {/* Note: Maybe change this to not include the whole svg path inside of the code */}
                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#570a07" transform="scale(-1, 1)"><path d="M782.87-98.52 526.91-354.48q-29.43 21.74-68.15 34.61Q420.04-307 375.48-307q-114.09 0-193.55-79.46-79.45-79.45-79.45-193.54 0-114.09 79.45-193.54Q261.39-853 375.48-853q114.09 0 193.54 79.46 79.46 79.45 79.46 193.54 0 45.13-12.87 83.28T601-429.7l256.52 257.09-74.65 74.09ZM375.48-413q69.91 0 118.45-48.54 48.55-48.55 48.55-118.46t-48.55-118.46Q445.39-747 375.48-747t-118.46 48.54Q208.48-649.91 208.48-580t48.54 118.46Q305.57-413 375.48-413Z" /></svg>
                <span className='ml-1'
                  style={{ textShadow: "1px 1px 0px rgba(0, 0, 0, 1)", letterSpacing: "0.05rem" }}>
                  {enemyData != null ? capitalize(enemyData.name) : ""}
                </span>

                <div className='ml-auto mt-1 mr-1 gap-1'>
                  <button style={{ border: "2px solid #570a07", borderRadius: 4 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#570a07"><path d="M321.25-320.95Q256-385.9 256-479.7t64.95-159.05Q385.9-704 479.7-704t159.05 64.95Q704-574.1 704-480.3t-64.95 159.05Q574.1-256 480.3-256t-159.05-64.95Z" /></svg>
                  </button>
                  <button className='ml-1' style={{ border: "2px solid #570a07", borderRadius: 4 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#570a07"><path d="M320-120v-200H120v-320h200v-200h320v200h200v320H640v200H320Z" /></svg>
                  </button>
                  <button className='ml-1' style={{ border: "2px solid #570a07", borderRadius: 4 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#570a07"><path d="M206.78-100.78q-44.3 0-75.15-30.85-30.85-30.85-30.85-75.15v-546.44q0-44.3 30.85-75.15 30.85-30.85 75.15-30.85h546.44q44.3 0 75.15 30.85 30.85 30.85 30.85 75.15v546.44q0 44.3-30.85 75.15-30.85 30.85-75.15 30.85H206.78Zm0-106h546.44v-546.44H206.78v546.44Zm0 0v-546.44 546.44Z" /></svg>
                  </button>
                </div>
              </div>
              <div className="grid gap-4 overflow-y-auto h-[60vh]" style={{
                gridTemplateAreas: "image data",
                gridTemplateColumns: "0fr 1fr",
                backgroundColor: "rgba(38, 38, 38)",
                overflowX: "visible", overflowY: "visible",
                border: "2px solid rgba(0,0,0,0.4)", borderStyle: "outset", borderTop: "0"
              }}>
                <div className='image min-w-60 pl-4 pb-4 pt-4 flex flex-col h-full min-h-0'>
                  <div className='w-full flex justify-center relative h-full min-h-0'
                    style={{
                      backgroundColor: "rgba(31, 31, 31)",
                      border: "2px solid rgba(0,0,0,0.4)", borderStyle: "outset",
                      overflow: "visible",
                      clipPath: "inset(0 0 0 -9999px)",
                      zIndex: 10,
                    }}>
                    {enemyData.full_body_url ? (
                      <img src={resolveExternalUrl(enemyData.full_body_url)}
                        className='h-full w-auto max-w-90 p-2 object-contain inline fade-in'
                        alt={enemyData.name + " full body"} />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] opacity-20">
                        NO_FULL_BODY_IMAGE
                      </div>)}
                  </div>
                  <a href={resolveExternalUrl(enemyData.wiki_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='mt-auto'
                    onClick={(e) => handleLinkClick(e, resolveExternalUrl(enemyData.wiki_link))}
                  >
                    <div className="h-[5vh] w-full mt-2 pt-2 pb-2 content-center
                    rounded-sm outline-3 outline-[rgba(0,0,0,0.6)]
                    bg-linear-to-b from-[#585858] to-[#1e1e1e]
                    hover:bg-none hover:bg-[#1d1d1d]"
                    >
                      Go to WIKI
                    </div>
                  </a>

                </div>
                <div
                  className='data text p-2 pb-4 pr-4 pl-0 h-full flex flex-col min-h-0'
                  style={{ textAlign: 'left' }}>
                  <Typewriter
                    text={enemyData.name}
                    className='text-3xl uppercase mb-1.5'
                    speed={0.04}
                  />
                  <div
                    className='pl-4 pr-4 flex-1 min-h-0'
                    style={{
                      lineHeight: "3rem",
                      backgroundColor: "rgba(31, 31, 31)",
                      overflowY: "scroll",
                      border: "2px solid rgba(0,0,0,0.4)",
                      borderStyle: "outset",
                    }}>
                    <Typewriter
                      segments={[
                        { text: "TYPE:", className: "text-red-500 uppercase" },
                        { text: ` ${capitalize(enemyData.enemy_type)}` },
                      ]}
                      speed={0.05}
                    />
                    <Typewriter
                      segments={[
                        { text: "WEIGHT:", className: "text-red-500 uppercase" },
                        { text: ` ${capitalize(enemyData.weight_class)}` },
                      ]}
                      speed={0.05}
                    />
                    <Typewriter
                      segments={[
                        { text: "HEALTH:", className: "text-red-500 uppercase" },
                        { text: ` ${enemyData.health}` },
                      ]}
                      speed={0.05}
                    />

                    <Typewriter
                      segments={[
                        { text: "BOSS:", className: "text-red-500 uppercase" },
                        { text: ` ${enemyData.is_boss ? "Yes" : "No"}` },
                      ]}
                      speed={0.05}
                    />

                    {/* Note: The Typewriter speed are balanced so that the levels data (which are fetched and loaded after the enemy data) seem to appear at the same time as the enemy data */}
                    {levelDataList != null && (
                      <div>
                        <Typewriter
                          segments={[
                            { text: "TOTAL LEVELS:", className: "text-red-500 uppercase" },
                            { text: ` ${levelDataList.length}` },
                          ]}
                          speed={0.03}
                        />
                        <Typewriter
                          segments={[
                            { text: "REGISTERED AT:", className: "text-red-500 uppercase" },
                            { text: ` ${enemyData.first_appearance}` },
                          ]}
                          speed={0.02}
                        />
                        <div className='pb-4'>
                          <Typewriter
                            text={`APPEARANCE${levelDataList.length > 1 ? "S" : ''}:`}
                            className='text-red-500 uppercase'
                            speed={0.04}
                          />
                          <div
                            className={`
                          ${levelDataList.length > 1 ?
                                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"
                                : ""
                              }
                        overflow - y - auto pr - 4 custom - scrollbar`}>
                            {levelDataList.map((level, index) => {
                              return (
                                <a
                                  key={level.id}
                                  href={resolveExternalUrl(level.wiki_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => handleLinkClick(e, resolveExternalUrl(level.wiki_url))}
                                  className="group flex flex-col gap-2 transition-all duration-200 uppercase fade-in"
                                  style={{ textAlign: 'center', animationDelay: `${index * 0.1 + 0.5}s` }}
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
                                      {level.level_number}: {level.level_name}
                                    </span>
                                    <div className="h-0.5 w-full bg-white group-hover:bg-indigo-400 transition-colors" />
                                  </div>
                                  <div className="aspect-video w-full bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center relative">
                                    {level.thumbnail_url ? (
                                      <img
                                        src={resolveExternalUrl(level.thumbnail_url)}
                                        alt={level.level_name}
                                        className="w-full h-full object-cover filter brightness-75 group-hover:brightness-100 transition-all duration-200"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] opacity-20">
                                        NO_THUMBNAIL
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors" />
                                  </div>
                                </a>
                              )
                            })
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  )
}

export default EnemyPage;
