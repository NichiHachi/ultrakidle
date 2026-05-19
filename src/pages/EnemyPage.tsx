import { useCallback, useEffect, useState } from 'react';
import SEO from '../components/SEO';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sup } from 'framer-motion/m';

const EnemyPage = () => {
  const { enemy } = useParams();
  const [enemyData, setEnemyData] = useState<JSON | null>(null);
  const [enemyLevel, setEnemyLevel] = useState<JSON[] | null>(null);


  function capitalize(word: string) {
    return word.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const fetchData = useCallback(async () => {
    const { data: enemyData, error: enemyError } = await supabase
      .from("ultrakill_enemies")
      .select("*")
      .eq("name", enemy)
      .single();
    if (enemyError) {
      if (enemyError.message.includes("CLIENT_OUTDATED"))
        return;
    }

    setEnemyData(enemyData);


    const { data: levelData, error: levelError } = await supabase
      .from("level_enemies")
      .select("level_id")
      .eq("enemy_id", enemyData.id);

    if (levelError) {
      if (levelError.message.includes("CLIENT_OUTDATED"))
        return;
    }

    setEnemyLevel(levelData);
  }, [setEnemyData, setEnemyLevel, enemy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
      <SEO title="Enemy detail" description="A detail description of the selected enemy in ULTRAKILL with their stats." />
      <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 font-bold tracking-widest">
        <div className="flex justify-between flex-wrap items-center border-b border-white/10 pb-4">
          <h1 className="text-3xl text-white uppercase">ENEMY_DETAIL</h1>
          <span className="text-sm opaimageimagecity-50 tracking-normal normal-case font-normal uppercase">
            {enemyData == null ? 0 : Object.keys(enemyData).length} ENTRIES FOUND
          </span>
        </div>
        {
          enemyData != null && (
            <div className="grid gap-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar p-2" style={{ gridTemplateAreas: "image data", gridTemplateColumns: "0fr 1fr", backgroundColor: "#2f2f2f" }}>
              <div className='image min-w-60'>
                <div className='w-[100%] flex justify-center'
                  style={{ backgroundColor: "#181818" }}>
                  <img src={enemyData.full_body_url}
                    className='max-w-60 max-h-[55vh] p-2' />
                </div>
                <a href={enemyData.wiki_link}>
                  <button
                    className='h-[5vh] w-full mt-2 pt-2 pb-2 '
                    style={{
                      borderRadius: 4,
                      background: "linear-gradient(#585858,#2a2a2a, #1e1e1e)",
                      border: "2px solid black",
                      borderStyle: "outset"
                    }}
                  >
                    Go to WIKI page
                  </button>
                </a>

              </div>
              <div
                className='data text'
                style={{ textAlign: 'left' }}>
                <h2 className='text-3xl uppercase mb-1.5'>
                  {enemyData.name}
                </h2>
                <div
                  className='pl-4'
                  style={{
                    lineHeight: "3rem", backgroundColor: "#181818", height: "93%", boxSizing: "border-box"
                  }}>
                  <span className='text-red-500'>
                    TYPE:
                  </span>
                  <span> {capitalize(enemyData.enemy_type)}</span>
                  <br />
                  <span className='text-red-500'>
                    WEIGHT:
                  </span>
                  <span> {capitalize(enemyData.weight_class)}</span>
                  <br />
                  <span className='text-red-500'>
                    HEALTH:
                  </span>
                  <span> {enemyData.health}</span>
                  <br />
                  {
                    enemyLevel != null && (
                      <div>
                        <span className='text-red-500'>
                          TOTAL LEVELS:
                        </span>
                        <span> {enemyLevel.length}</span>
                        <br />
                        <span className='text-red-500'>
                          REGISTERED AT:
                        </span>
                        <span> {enemyData.first_appearance}</span>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div >
  )
}

export default EnemyPage;
