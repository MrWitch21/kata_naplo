import { useRef } from 'react'
import { useStore } from '../store/store'
import { Button } from '../components/ui'
import { Logo } from '../components/Layout'

export function Welcome() {
  const { loadDemo, startEmpty, importData } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Logo size={44} />
        <h1 className="mt-6 text-[clamp(2.2rem,6vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em]">
          Számlák, bevételi keret és KATA-adó egy helyen.
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-muted">
          Rögzítsd a számláidat, és mindig látod, mennyi fér még bele a keretbe, mennyi adó jön, és mikor kell fizetni.
          A 2027-es új KATA szabályait is ismeri.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="primary" className="px-5 py-2.5 text-base" onClick={loadDemo}>
            Kipróbálom demóadatokkal
          </Button>
          <Button className="px-5 py-2.5 text-base" onClick={startEmpty}>
            Kezdés üresen
          </Button>
          <Button variant="ghost" className="px-5 py-2.5 text-base" onClick={() => fileRef.current?.click()}>
            Mentés visszatöltése
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                importData(JSON.parse(await f.text()))
              } catch {
                alert('Ez a fájl nem Katanapló-mentés.')
              }
            }}
          />
        </div>
        <p className="mt-10 border-t border-line pt-4 text-sm text-muted">
          Az adatok csak a te böngésződben tárolódnak. Ez tájékoztató eszköz, nem adótanácsadás. A 2027-es szabályok a
          2026. októberi törvényjavaslaton alapulnak, és a kihirdetésig változhatnak.
        </p>
      </div>
    </div>
  )
}
