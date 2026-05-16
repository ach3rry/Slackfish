import { useState } from 'react'
import { GAME_CONFIG } from '../game/config'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const panelGlass: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(30,26,20,0.97) 0%, rgba(20,18,14,0.97) 100%)',
  border: '3px solid #6f604c',
  boxShadow: 'inset 0 0 0 2px #141414, 0 4px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.5)',
  borderRadius: 20,
}

const btnGold: React.CSSProperties = {
  padding: '24px 0',
  borderRadius: 16,
  fontSize: 32,
  fontWeight: 900,
  letterSpacing: 4,
  background: 'linear-gradient(180deg, #ffd740 0%, #ffb300 50%, #ff8f00 100%)',
  color: '#3e2723',
  border: '3px solid #e65100',
  borderBottomWidth: 6,
  textShadow: '0 2px 0 rgba(255,255,255,0.3)',
  boxShadow: '0 5px 0 #bf360c, 0 10px 25px rgba(255,143,0,0.35)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnDark: React.CSSProperties = {
  padding: '20px 0',
  borderRadius: 14,
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: 3,
  background: 'linear-gradient(180deg, #455a64 0%, #37474f 50%, #263238 100%)',
  color: '#b0bec5',
  border: '2px solid #546e7a',
  borderBottomWidth: 4,
  boxShadow: '0 3px 0 #1a2327, 0 5px 12px rgba(0,0,0,0.3)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnGreen: React.CSSProperties = {
  padding: '22px 0',
  borderRadius: 14,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 3,
  background: 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)',
  color: '#fff',
  border: '3px solid #2e7d32',
  borderBottomWidth: 5,
  boxShadow: '0 4px 0 #1b5e20, 0 8px 20px rgba(76,175,80,0.3)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
}

const btnRed: React.CSSProperties = {
  padding: '22px 0',
  borderRadius: 14,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 3,
  background: 'linear-gradient(180deg, #ef5350 0%, #c62828 100%)',
  color: '#fff',
  border: '3px solid #b71c1c',
  borderBottomWidth: 5,
  boxShadow: '0 4px 0 #7f0000, 0 8px 20px rgba(244,67,54,0.3)',
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  cursor: 'pointer',
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
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const handleRestart = () => { restart(); gameBus.restart() }
  const handleStart = () => { const guide = window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) !== '1'; startGame(); if (!guide) gameBus.start() }
  const handleGuideOk = () => { markGuideSeen(); gameBus.start() }

  return (
    <>
      {/* ===== 排行榜弹窗 ===== */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="mx-8 w-full max-w-lg" style={{ ...panelGlass, padding: '32px 28px' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#ffd740', fontFamily: 'Microsoft YaHei, SimHei, sans-serif' }}>
                排行榜
              </h2>
              <button onClick={() => setShowLeaderboard(false)}
                className="transition-transform active:scale-90"
                style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)', color: '#8a7a60', fontSize: 24, fontWeight: 900, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6a5a48', fontSize: 22, padding: '40px 0' }}>还没有记录，快去摸鱼吧！</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#5a4a38 transparent' }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.id}
                    className="flex items-center gap-4 rounded-xl"
                    style={{ padding: '14px 18px', background: i === 0 ? 'rgba(255,215,64,0.08)' : 'rgba(255,255,255,0.03)', border: `2px solid ${i === 0 ? 'rgba(255,215,64,0.25)' : 'rgba(111,96,76,0.25)'}` }}>
                    <div className="flex-shrink-0 text-center" style={{ width: 44 }}>
                      {i === 0 ? <span style={{ fontSize: 28 }}>🥇</span> : i === 1 ? <span style={{ fontSize: 28 }}>🥈</span> : i === 2 ? <span style={{ fontSize: 28 }}>🥉</span> : <span style={{ fontSize: 22, fontWeight: 800, color: '#6a5a48' }}>{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#ffa726' }}>{entry.title}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1" style={{ fontSize: 14, color: '#8a7a60' }}>
                        <span>⏱ {fmt(entry.elapsedSeconds)}</span>
                        <span>💰 {entry.salary}</span>
                        <span>🐟 {entry.fish}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowLeaderboard(false)}
              className="mt-6 w-full transition-transform active:scale-95"
              style={btnDark}>
              关闭
            </button>
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

          {/* 标题 */}
          <div className="relative z-10 text-center w-full flex flex-col items-center" style={{ height: '15%', justifyContent: 'center' }}>
            <div className="flex items-center justify-center gap-4 mb-1">
              <span style={{ fontSize: 48 }}>🐟</span>
              <h1 style={{
                fontSize: 96,
                fontWeight: 900,
                letterSpacing: 8,
                color: '#ffa726',
                textShadow: '4px 4px 0 #bf5600, -2px -2px 0 #ffcc02, 0 0 30px rgba(255,167,38,0.5)',
                fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
                lineHeight: 1.1,
              }}>
                工位摸鱼
              </h1>
              <span style={{ fontSize: 48 }}>☕</span>
            </div>
            <p style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 12,
              color: '#87ceeb',
              textShadow: '2px 2px 0 #2a5a7a',
            }}>
              伪装局
            </p>
            <p style={{ fontSize: 22, color: '#a89070', marginTop: 8, letterSpacing: 3 }}>
              办公室生存 · 摸鱼不被抓！
            </p>
          </div>

          {/* 角色 */}
          <div className="relative z-10 flex items-center justify-center" style={{ height: '25%' }}>
            <div className="relative">
              <div className="absolute rounded-full opacity-30"
                style={{ inset: -20, background: 'radial-gradient(circle, rgba(255,167,38,0.3) 0%, transparent 70%)' }} />
              <img src="/sprites/employee-idle.png" alt=""
                className="relative drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]"
                style={{ width: 200, height: 'auto', imageRendering: 'pixelated' }} />
            </div>
          </div>

          {/* 按钮 */}
          <div className="relative z-10 w-full flex flex-col items-center gap-5" style={{ height: '22%', justifyContent: 'center', padding: '0 17.5%' }}>
            <button onClick={handleStart}
              className="w-full transition-transform active:scale-95"
              style={btnGold}>
              开始游戏 →
            </button>
            <button onClick={() => setShowLeaderboard(true)}
              className="w-full transition-transform active:scale-95"
              style={btnDark}>
              排行榜
            </button>
          </div>

          {/* 小贴士 */}
          <div className="relative z-10 w-full flex items-center justify-center" style={{ height: '10%', padding: '0 8%' }}>
            <div className="w-full rounded-2xl text-center"
              style={{ padding: '20px 24px', background: 'rgba(30,25,18,0.85)', border: '2px solid rgba(168,144,112,0.25)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#a89070', marginBottom: 6 }}>💡 今日小贴士</p>
              <p style={{ fontSize: 16, color: '#8a7a60' }}>卫生间是绝对安全区，老板不会进来检查！</p>
            </div>
          </div>

          <div className="relative z-10 flex-1" />

          <div className="relative z-10 text-center w-full" style={{ padding: '16px 5% 24px' }}>
            <p style={{ fontSize: 12, color: '#4a3a28', lineHeight: 1.8 }}>
              抵制不良游戏 拒绝盗版游戏 注意自我保护 谨防受骗上当<br />
              适度游戏益脑 沉迷游戏伤身 合理安排时间 享受健康生活
            </p>
          </div>
        </div>
      )}

      {/* ===== 新手引导 ===== */}
      {guideOpen && phase === 'playing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="max-w-md w-full mx-6" style={{ ...panelGlass, padding: '32px 28px' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#87ceeb', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', textAlign: 'center', marginBottom: 20 }}>
              新手引导
            </h2>
            <div className="space-y-4" style={{ color: '#c8b898', fontSize: 18, lineHeight: 1.6 }}>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 20 }}>1</span>
                <span>点击底部「区域」按钮移动到不同区域</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 20 }}>2</span>
                <span>到达后选择对应「行为」开始摸鱼</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 20 }}>3</span>
                <span><strong style={{ color: '#66bb6a' }}>卫生间是安全区</strong>，老板不会进来</span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 20 }}>4</span>
                <span><strong style={{ color: '#ffa726' }}>茶水间收益高但风险极大</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: '#ffd740', fontWeight: 900, fontSize: 20 }}>5</span>
                <span><strong style={{ color: '#87ceeb' }}>正常工作能涨工资</strong>，但没摸鱼收益</span>
              </div>
            </div>
            <button onClick={handleGuideOk}
              className="mt-7 w-full transition-transform active:scale-95"
              style={btnGold}>
              知道了，开始摸鱼！
            </button>
          </div>
        </div>
      )}

      {/* ===== 抓包提示 ===== */}
      {catchNotice && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="rounded-2xl text-center" style={{
            padding: '28px 36px',
            background: 'linear-gradient(180deg, rgba(40,12,12,0.97) 0%, rgba(70,18,18,0.97) 100%)',
            border: '3px solid rgba(248,113,113,0.45)',
            boxShadow: '0 0 50px rgba(248,113,113,0.25), inset 0 0 30px rgba(248,113,113,0.08)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 4 }}>🚨</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fca5a5', letterSpacing: 2 }}>{catchNotice.title}</p>
            <h2 style={{ marginTop: 8, fontSize: 40, fontWeight: 900, color: '#fecdd3' }}>
              -{catchNotice.amount} <span style={{ fontSize: 22, color: '#fca5a5' }}>工资</span>
            </h2>
            <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <p style={{ fontSize: 16, color: '#c9a0a0', fontStyle: 'italic' }}>"{catchNotice.message}"</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== 通关成功 ===== */}
      {phase === 'won' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)' }}>
          {/* 星光背景 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.15 }}>
            <div className="absolute rounded-full" style={{
              left: '50%', top: '35%', width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(255,215,64,0.6) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
            }} />
          </div>

          <div className="mx-6 w-full max-w-lg relative z-10" style={{ ...panelGlass, padding: '36px 28px', borderColor: 'rgba(255,215,64,0.35)' }}>
            {/* 头部装饰 */}
            <div className="text-center" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 56, filter: 'drop-shadow(0 0 12px rgba(255,215,64,0.5))' }}>🏆</div>
            </div>
            <h2 className="text-center" style={{ fontSize: 38, fontWeight: 900, color: '#ffd740', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', textShadow: '0 0 20px rgba(255,215,64,0.3)' }}>
              通关成功！
            </h2>
            <p className="text-center" style={{ fontSize: 30, fontWeight: 800, color: '#ffa726', marginTop: 8 }}>
              {finalTitle || '摸鱼熟练工'}
            </p>

            {/* 分割线 */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,215,64,0.3), transparent)', margin: '20px 0' }} />

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl text-center" style={{ padding: '14px 8px', background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(111,96,76,0.3)' }}>
                <p style={{ fontSize: 14, color: '#8a7a60', fontWeight: 600 }}>用时</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#e8dcc8', marginTop: 4 }}>{fmt(elapsed)}</p>
              </div>
              <div className="rounded-xl text-center" style={{ padding: '14px 8px', background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(111,96,76,0.3)' }}>
                <p style={{ fontSize: 14, color: '#8a7a60', fontWeight: 600 }}>工资</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#9bd34f', marginTop: 4 }}>{Math.round(salary)}</p>
              </div>
              <div className="rounded-xl text-center" style={{ padding: '14px 8px', background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(111,96,76,0.3)' }}>
                <p style={{ fontSize: 14, color: '#8a7a60', fontWeight: 600 }}>摸鱼</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#87ceeb', marginTop: 4 }}>{Math.round(fish)}</p>
              </div>
            </div>

            {/* 排行榜预览 */}
            {leaderboard.length > 0 && (
              <div className="mt-5">
                <p style={{ fontSize: 16, fontWeight: 700, color: '#8a7a60', marginBottom: 8 }}>最新排行</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)', border: '2px solid rgba(111,96,76,0.2)' }}>
                  {leaderboard.slice(0, 3).map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: i < 2 ? '1px solid rgba(111,96,76,0.15)' : 'none' }}>
                      <span style={{ fontSize: 20 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#ffa726', flex: 1 }}>{entry.title}</span>
                      <span style={{ fontSize: 14, color: '#8a7a60' }}>💰 {entry.salary}</span>
                      <span style={{ fontSize: 14, color: '#8a7a60' }}>🐟 {entry.fish}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 按钮 */}
            <div className="grid grid-cols-2 gap-4 mt-7">
              <button onClick={handleRestart}
                className="w-full transition-transform active:scale-95"
                style={btnGreen}>
                再来一局
              </button>
              <button onClick={() => setShowLeaderboard(true)}
                className="w-full transition-transform active:scale-95"
                style={btnDark}>
                排行榜
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 游戏失败 ===== */}
      {phase === 'lost' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
          {/* 红色光晕 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.12 }}>
            <div className="absolute rounded-full" style={{
              left: '50%', top: '38%', width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(244,67,54,0.7) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
            }} />
          </div>

          <div className="mx-6 w-full max-w-lg relative z-10" style={{
            ...panelGlass, padding: '36px 28px',
            background: 'linear-gradient(180deg, rgba(35,14,14,0.97) 0%, rgba(25,12,12,0.97) 100%)',
            borderColor: 'rgba(248,113,113,0.35)',
          }}>
            <div className="text-center" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 56 }}>💀</div>
            </div>
            <h2 className="text-center" style={{ fontSize: 36, fontWeight: 900, color: '#fca5a5', fontFamily: 'Microsoft YaHei, SimHei, sans-serif', textShadow: '0 0 20px rgba(248,113,113,0.2)' }}>
              你被老板抓包了！
            </h2>

            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(248,113,113,0.25), transparent)', margin: '18px 0' }} />

            <div className="text-center space-y-3" style={{ color: '#c9a0a0', fontSize: 20 }}>
              <p>上班摸鱼被抓，<strong style={{ color: '#fca5a5' }}>本次工资没了！</strong></p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#f87171' }}>老板决定解雇你</p>
            </div>

            {/* 摸鱼统计 */}
            <div className="mt-5 rounded-xl text-center" style={{ padding: '14px', background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(248,113,113,0.15)' }}>
              <p style={{ fontSize: 14, color: '#8a7a60', fontWeight: 600 }}>摸鱼收益</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#87ceeb', marginTop: 4 }}>🐟 {Math.floor(fish)}</p>
              <p style={{ fontSize: 14, color: '#6a5a48', marginTop: 4 }}>下次记得用卫生间当安全屋</p>
            </div>

            {/* 按钮 */}
            <div className="grid grid-cols-2 gap-4 mt-7">
              <button onClick={handleRestart}
                className="w-full transition-transform active:scale-95"
                style={btnRed}>
                重新挑战
              </button>
              <button onClick={handleRestart}
                className="w-full transition-transform active:scale-95"
                style={btnDark}>
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
