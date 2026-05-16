import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'

export function GuideModal() {
  const markGuideSeen = useGameStore((state) => state.markGuideSeen)

  const handleClose = () => {
    markGuideSeen()
    gameBus.start()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-6 backdrop-blur-sm">
      <section className="modal-panel max-w-[620px]">
        <p className="mb-2 text-sm font-black text-cyan-200">新手引导</p>
        <h2 className="mb-5 text-4xl font-black text-amber-100">先活下来，再摸大鱼</h2>
        <div className="space-y-3 text-left text-slate-200">
          <p>💻 工位区能正常工作回血，也能低风险看视频、吃薯片。</p>
          <p>🧋 茶水间收益最高，但老板会重点巡查，被看到 1 秒就扣工资。</p>
          <p>🚻 卫生间是绝对安全区，老板不会进去，适合紧急避险。</p>
          <p>👔 老板开门前会预警，看到红色扇形视野就赶紧撤。</p>
        </div>
        <button className="start-button mt-7 w-full justify-center" onClick={handleClose} type="button">
          明白，开溜
        </button>
      </section>
    </div>
  )
}
