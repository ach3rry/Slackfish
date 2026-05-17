import { useState } from 'react'
import { GAME_CONFIG } from '../game/config'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/* ── panel & card ── */

const panelGlass: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1e1a14 0%, #131110 100%)',
  border: '2px solid rgba(139,109,71,0.25)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(0,0,0,0.8), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
}

const cardBase: React.CSSProperties = {
  width: '72%',
  maxHeight: '68%',
  display: 'flex',
  flexDirection: 'column',
  padding: '36px 32px',
  overflow: 'hidden',
}

/* ── buttons ── */

const btnGold: React.CSSProperties = {
  padding: '22px 0',
  borderRadius: 12,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 3,
  background: 'linear-gradient(180deg, #ffd740 0%, #f9a825 100%)',
  color: '#3e2723',
  border: 'none',
  textShadow: '0 1px 0 rgba(255,255,255,0.25)',
  boxShadow: '0 4px 16px rgba(255,171,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnDark: React.CSSProperties = {
  padding: '20px 0',
  borderRadius: 12,
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: 2,
  background: 'rgba(255,255,255,0.06)',
  color: '#9a8a7a',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnGreen: React.CSSProperties = {
  padding: '22px 0',
  borderRadius: 12,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: 2,
  background: 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)',
  color: '#fff',
  border: 'none',
  boxShadow: '0 4px 16px rgba(76,175,80,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnRed: React.CSSProperties = {
  padding: '22px 0',
  borderRadius: 12,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: 2,
  background: 'linear-gradient(180deg, #ef5350 0%, #c62828 100%)',
  color: '#fff',
  border: 'none',
  boxShadow: '0 4px 16px rgba(244,67,54,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

/* ── helpers ── */

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl"
      style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 18, color: '#7a6a5a', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 900, color: valueColor }}>{value}</span>
    </div>
  )
}

function Divider({ color = 'rgba(255,255,255,0.06)' }: { color?: string }) {
  return <div style={{ height: 1, background: color, margin: '16px 0' }} />
}

export function ModalLayer() {
  const phase = useGameStore((s) => s.phase)
  const salary = useGameStore((s) => s.salary)
  const fish = useGameStore((s) => s.fish)
  const elapsed = useGameStore((s) => s.elapsedSeconds)
  const catchNotice = useGameStore((s) => s.catchNotice)
  const finalTitle = useGameStore((s) => s.finalTitle)
  const guideOpen = useGameStore((s) => s.guideOpen)
  const restart = useGameStore((s) => s.restartGame)
  const startGame = useGameStore((s) => s.startGame)
  const markGuideSeen = useGameStore((s) => s.markGuideSeen)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const placeholderOpen = useGameStore((s) => s.placeholderOpen)
  const hidePlaceholder = useGameStore((s) => s.hidePlaceholder)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const handleRestart = () => { restart(); gameBus.restart() }
  const handleHome = () => { restart(); gameBus.restart(); useGameStore.setState({ phase: 'start', subPage: null }) }
  const handleStart = () => { const guide = window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) !== '1'; startGame(); if (!guide) gameBus.start() }
  const handleGuideOk = () => { markGuideSeen(); gameBus.start() }

  return (
    <>
      {/* ===== 排行榜 ===== */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ ...cardBase, ...panelGlass }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#ffd740', fontFamily: 'Microsoft YaHei, SimHei, sans-serif' }}>排行榜</h2>
              <button onClick={() => setShowLeaderboard(false)}
                className="transition-transform active:scale-90"
                style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6a5a4a', fontSize: 22, fontWeight: 900, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <Divider />

            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3a3228 transparent', margin: '0 -4px', padding: '0 4px' }}>
              {leaderboard.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: '100%' }}>
                  <p style={{ textAlign: 'center', color: '#5a4a3a', fontSize: 20, lineHeight: 1.6 }}>还没有记录<br />快去摸鱼吧！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-xl"
                      style={{ padding: '12px 16px', background: i === 0 ? 'rgba(255,215,64,0.06)' : 'transparent', border: `1px solid ${i === 0 ? 'rgba(255,215,64,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                      <div className="flex-shrink-0 text-center" style={{ width: 40 }}>
                        {i === 0 ? <span style={{ fontSize: 24 }}>🥇</span> : i === 1 ? <span style={{ fontSize: 24 }}>🥈</span> : i === 2 ? <span style={{ fontSize: 24 }}>🥉</span> : <span style={{ fontSize: 18, fontWeight: 800, color: '#5a4a3a' }}>{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#ffa726' }}>{entry.title}</span>
                        <div className="flex items-center gap-3 mt-1" style={{ fontSize: 14, color: '#6a5a4a' }}>
                          <span>⏱ {fmt(entry.elapsedSeconds)}</span>
                          <span>💰{entry.salary}</span>
                          <span>🐟{entry.fish}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button onClick={() => setShowLeaderboard(false)} className="w-full transition-transform active:scale-95" style={btnDark}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 开始界面 ===== */}
      {phase === 'start' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #1a1208 0%, #2a1f0e 30%, #1c1812 70%, #0d0b08 100%)' }}>

          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: 'url(/images2d/各场景总视图.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(4px) brightness(0.4)',
          }} />

          <div style={{ height: '5%' }} />

          <div className="relative z-10 text-center w-full flex flex-col items-center" style={{ height: '15%', justifyContent: 'center' }}>
            <div className="flex items-center justify-center gap-4 mb-1">
              <span style={{ fontSize: 52 }}>🐟</span>
              <h1 style={{
                fontSize: 96, fontWeight: 900, letterSpacing: 8, color: '#ffa726',
                textShadow: '4px 4px 0 #bf5600, -2px -2px 0 #ffcc02, 0 0 30px rgba(255,167,38,0.5)',
                fontFamily: 'Microsoft YaHei, SimHei, sans-serif', lineHeight: 1.1,
              }}>
                工位摸鱼
              </h1>
              <span style={{ fontSize: 52 }}>☕</span>
            </div>
            <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: 12, color: '#87ceeb', textShadow: '2px 2px 0 #2a5a7a' }}>伪装局</p>
            <p style={{ fontSize: 24, color: '#a89070', marginTop: 8, letterSpacing: 3 }}>办公室生存 · 摸鱼不被抓！</p>
          </div>

          <div className="relative z-10 flex items-center justify-center" style={{ height: '25%' }}>
            <div className="relative">
              <div className="absolute rounded-full opacity-30"
                style={{ inset: -20, background: 'radial-gradient(circle, rgba(255,167,38,0.3) 0%, transparent 70%)' }} />
              <img src="/sprites/employee-idle.png" alt=""
                className="relative drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]"
                style={{ width: 260, height: 'auto', imageRendering: 'pixelated' }} />
            </div>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center gap-5" style={{ height: '22%', justifyContent: 'center', padding: '0 12%' }}>
            <button onClick={handleStart} className="w-full transition-transform active:scale-95" style={btnGold}>开始游戏 →</button>
            <button onClick={() => setShowLeaderboard(true)} className="w-full transition-transform active:scale-95" style={btnDark}>排行榜</button>
          </div>

          <div className="relative z-10 w-full flex items-center justify-center" style={{ height: '10%', padding: '0 8%' }}>
            <div className="w-full rounded-2xl text-center"
              style={{ padding: '22px 28px', background: 'rgba(30,25,18,0.85)', border: '2px solid rgba(168,144,112,0.25)' }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#a89070', marginBottom: 6 }}>💡 今日小贴士</p>
              <p style={{ fontSize: 18, color: '#8a7a60' }}>卫生间是绝对安全区，老板不会进来检查！</p>
            </div>
          </div>

          <div className="relative z-10 flex-1" />

          <div className="relative z-10 text-center w-full" style={{ padding: '16px 5% 24px' }}>
            <p style={{ fontSize: 14, color: '#4a3a28', lineHeight: 1.8 }}>
              抵制不良游戏 拒绝盗版游戏 注意自我保护 谨防受骗上当<br />
              适度游戏益脑 沉迷游戏伤身 合理安排时间 享受健康生活
            </p>
          </div>
        </div>
      )}

      {/* ===== 新手引导 ===== */}
      {guideOpen && phase === 'playing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50" style={{ backdropFilter: 'blur(6px)' }}>
          <div style={{ ...cardBase, ...panelGlass }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#87ceeb', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', textAlign: 'center' }}>
              新手引导
            </h2>
            <Divider />

            <div className="flex-1 flex flex-col justify-center space-y-5" style={{ color: '#b8a888', fontSize: 20, lineHeight: 1.6 }}>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 22, minWidth: 28 }}>1</span>
                <span>点击底部「区域」按钮移动到不同区域</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 22, minWidth: 28 }}>2</span>
                <span>到达后选择对应「行为」开始摸鱼</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 22, minWidth: 28 }}>3</span>
                <span><strong style={{ color: '#66bb6a' }}>卫生间是安全区</strong>，老板不会进来</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 22, minWidth: 28 }}>4</span>
                <span><strong style={{ color: '#ffa726' }}>茶水间收益高但风险极大</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 22, minWidth: 28 }}>5</span>
                <span><strong style={{ color: '#87ceeb' }}>正常工作能涨工资</strong>，但没摸鱼收益</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button onClick={handleGuideOk} className="w-full transition-transform active:scale-95" style={btnGold}>
                知道了，开始摸鱼！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 抓包提示 ===== */}
      {catchNotice && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(120,8,8,0.3)', backdropFilter: 'blur(4px)' }}>
          <div style={{
            width: '62%',
            background: 'linear-gradient(180deg, #2a0e0e 0%, #1a0808 100%)',
            border: '2px solid rgba(248,113,113,0.3)',
            borderRadius: 20,
            boxShadow: '0 0 60px rgba(248,113,113,0.15), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(248,113,113,0.08)',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'catchPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🚨</div>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fca5a5', letterSpacing: 3, marginBottom: 16 }}>{catchNotice.title}</p>

            <div style={{
              fontSize: 72, fontWeight: 900, color: '#fecdd3', lineHeight: 1,
              textShadow: '0 0 30px rgba(248,113,113,0.4)',
              marginBottom: 8,
            }}>
              -{catchNotice.amount}
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(252,165,165,0.8)', marginBottom: 20, letterSpacing: 3 }}>工资</span>

            <div style={{
              width: '100%', padding: '16px 20px', borderRadius: 12,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(248,113,113,0.12)',
            }}>
              <p style={{ fontSize: 22, fontWeight: 600, color: '#b08888', fontStyle: 'italic', lineHeight: 1.5, textAlign: 'center' }}>
                "{catchNotice.message}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== 通关成功 ===== */}
      {phase === 'won' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.1 }}>
            <div className="absolute rounded-full" style={{
              left: '50%', top: '35%', width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(255,215,64,0.6) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
            }} />
          </div>

          <div style={{
            ...cardBase, ...panelGlass,
            border: '2px solid rgba(255,215,64,0.2)',
            boxShadow: '0 0 40px rgba(255,215,64,0.06), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div className="text-center">
              <div style={{ fontSize: 56, filter: 'drop-shadow(0 0 12px rgba(255,215,64,0.4))' }}>🏆</div>
              <h2 style={{ fontSize: 34, fontWeight: 900, color: '#ffd740', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', marginTop: 8 }}>
                通关成功！
              </h2>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#ffa726', marginTop: 4 }}>
                {finalTitle || '摸鱼熟练工'}
              </p>
            </div>

            <Divider color="rgba(255,215,64,0.12)" />

            <div className="space-y-2">
              <StatRow label="用时" value={fmt(elapsed)} valueColor="#e8dcc8" />
              <StatRow label="工资" value={String(Math.round(salary))} valueColor="#9bd34f" />
              <StatRow label="摸鱼" value={String(Math.round(fish))} valueColor="#87ceeb" />
            </div>

            {leaderboard.length > 0 && (
              <>
                <Divider color="rgba(255,215,64,0.08)" />
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#6a5a4a', marginBottom: 6 }}>最新排行</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {leaderboard.slice(0, 3).map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3" style={{ padding: '8px 14px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#ffa726', flex: 1 }}>{entry.title}</span>
                        <span style={{ fontSize: 14, color: '#6a5a4a' }}>💰{entry.salary}</span>
                        <span style={{ fontSize: 14, color: '#6a5a4a' }}>🐟{entry.fish}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex-1" />
            <div className="grid grid-cols-2 gap-3" style={{ marginTop: 16 }}>
              <button onClick={handleRestart} className="w-full transition-transform active:scale-95" style={btnGreen}>再来一局</button>
              <button onClick={() => setShowLeaderboard(true)} className="w-full transition-transform active:scale-95" style={btnDark}>排行榜</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 游戏失败 ===== */}
      {phase === 'lost' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.1 }}>
            <div className="absolute rounded-full" style={{
              left: '50%', top: '38%', width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(244,67,54,0.7) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
            }} />
          </div>

          <div style={{
            ...cardBase,
            background: 'linear-gradient(180deg, #1e0e0e 0%, #130808 100%)',
            border: '2px solid rgba(248,113,113,0.2)',
            borderRadius: 20,
            boxShadow: '0 0 40px rgba(248,113,113,0.08), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(248,113,113,0.06)',
          }}>
            <div className="text-center">
              <div style={{ fontSize: 56 }}>💀</div>
              <h2 style={{ fontSize: 34, fontWeight: 900, color: '#fca5a5', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', marginTop: 8 }}>
                你被老板抓包了！
              </h2>
            </div>

            <Divider color="rgba(248,113,113,0.1)" />

            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: 12 }}>
              <p style={{ fontSize: 20, color: '#a08080', lineHeight: 1.6 }}>
                上班摸鱼被抓，<strong style={{ color: '#fca5a5' }}>本次工资没了！</strong>
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#f87171' }}>
                老板决定解雇你
              </p>

              <div className="w-full rounded-xl text-center" style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
                <p style={{ fontSize: 14, color: '#6a5a4a', fontWeight: 600 }}>摸鱼收益</p>
                <p style={{ fontSize: 40, fontWeight: 900, color: '#87ceeb', marginTop: 4 }}>🐟 {Math.floor(fish)}</p>
                <p style={{ fontSize: 16, color: '#5a4a3a', marginTop: 4 }}>下次记得用卫生间当安全屋</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: 16 }}>
              <button onClick={handleRestart} className="w-full transition-transform active:scale-95" style={btnRed}>重新挑战</button>
              <button onClick={handleHome} className="w-full transition-transform active:scale-95" style={btnDark}>返回首页</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 功能暂未开放 ===== */}
      {placeholderOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={hidePlaceholder}>
          <div style={{
            ...panelGlass,
            width: '56%', padding: '36px 32px', textAlign: 'center',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', marginBottom: 12 }}>
              功能暂未开放
            </h2>
            <p style={{ fontSize: 18, color: '#7a6a5a', lineHeight: 1.6, marginBottom: 20 }}>
              正在疯狂开发中，敬请期待！
            </p>
            <button onClick={hidePlaceholder}
              className="w-full transition-transform active:scale-95"
              style={btnGold}>
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  )
}
