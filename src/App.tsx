import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { geographicBuildings } from "./data/geographic-buildings";
const Scene = lazy(() => import("./Scene"));
export type Command = {
  type: "reset" | "top" | "oblique" | "left" | "right" | "in" | "out" | "focus";
  serial: number;
  id?: string;
};
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function App() {
  const [command, setCommand] = useState<Command>({ type: "reset", serial: 0 });
  const [selected, setSelected] = useState<string>();
  const [labels, setLabels] = useState(true);
  const [models, setModels] = useState(true);
  const [reference, setReference] = useState(false);
  const [status, setStatus] = useState(
    "위성영상과 실제 지형을 연결하고 있습니다…",
  );
  const [failure, setFailure] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (reference) dialog.current?.showModal();
  }, [reference]);
  const send = (type: Command["type"], id?: string) =>
    setCommand((c) => ({
      type,
      id:
        id ??
        (["left", "right", "in", "out"].includes(type) ? selected : undefined),
      serial: c.serial + 1,
    }));
  const focus = (id: string) => {
    setSelected(id);
    send("focus", id);
  };
  const building = geographicBuildings.find((b) => b.id === selected);
  const fallback = (
    <div className="map-error" role="alert">
      <h2>실제 지도를 불러오지 못했습니다</h2>
      <p>{failure ?? "WebGL을 지원하는 브라우저에서 다시 확인해 주세요."}</p>
      <button onClick={() => location.reload()}>다시 불러오기</button>
    </div>
  );
  return (
    <div className="app">
      <header className="header">
        <a href="#campus-map" className="brand">
          <span className="brand-mark" aria-hidden="true">
            研
          </span>
          <span>
            <strong>한국학중앙연구원</strong>
            <small>GEOGRAPHIC CAMPUS</small>
          </span>
        </a>
        <div className="header-note">
          <span className="dot" /> 실제 지도 위의 캠퍼스
        </div>
        <button onClick={() => setReference(true)}>공식 안내도 ↗</button>
      </header>
      <main className="campus-workspace">
        <section
          id="campus-map"
          className="map-region"
          aria-label="실제 위성영상과 지형 위의 한국학중앙연구원 3D 지도"
        >
          <div className="map-canvas">
            {failure ? (
              fallback
            ) : (
              <SceneBoundary fallback={fallback}>
                <Suspense
                  fallback={
                    <div className="map-loading" role="status">
                      Cesium 3D 지도를 준비하고 있습니다…
                    </div>
                  }
                >
                  <Scene
                    command={command}
                    labels={labels}
                    models={models}
                    onSelect={focus}
                    onStatus={setStatus}
                    onFailure={setFailure}
                  />
                </Suspense>
              </SceneBoundary>
            )}
          </div>
          <div className="map-title">
            <p className="eyebrow">CESIUM · REAL WORLD</p>
            <h1>
              지형 위에서 만나는
              <br />
              한국학의 공간
            </h1>
            <p>실제 위성영상 · 실좌표 건물 · 사진 기반 형태</p>
          </div>
          <div className="map-layer-controls">
            <label>
              <input
                type="checkbox"
                checked={models}
                onChange={(e) => setModels(e.target.checked)}
              />{" "}
              건물 모델
            </label>
            <label>
              <input
                type="checkbox"
                checked={labels}
                onChange={(e) => setLabels(e.target.checked)}
              />{" "}
              시설명
            </label>
          </div>
          <div className="map-controls">
            <div className="control-group">
              <button onClick={() => send("oblique", selected)}>입체</button>
              <button onClick={() => send("top", selected)}>위에서</button>
            </div>
            <div className="control-group">
              <button aria-label="왼쪽으로 회전" onClick={() => send("left")}>
                ↶
              </button>
              <button
                aria-label="오른쪽으로 회전"
                onClick={() => send("right")}
              >
                ↷
              </button>
              <button aria-label="확대" onClick={() => send("in")}>
                +
              </button>
              <button aria-label="축소" onClick={() => send("out")}>
                −
              </button>
            </div>
            <button
              className="reset"
              onClick={() => {
                setSelected(undefined);
                send("reset");
              }}
            >
              캠퍼스 전체
            </button>
          </div>
          <div className="map-status" role="status">
            {status}
          </div>
          <p className="map-gesture">
            드래그 이동 · 우클릭/휠 확대 · Ctrl+드래그 회전
          </p>
        </section>
        <aside className="facility-panel">
          <div className="panel-heading">
            <p className="eyebrow">EXPLORE THE CAMPUS</p>
            <h2>
              전체 시설{" "}
              <span className="facility-count">
                {geographicBuildings.length}
              </span>
            </h2>
            <p>시설을 선택해 실제 위치로 이동합니다.</p>
          </div>
          {building && (
            <article className="building-details">
              <img
                src={building.photoUrl}
                alt={`${building.name} 공식 참고 사진`}
              />
              <h3>{building.name}</h3>
              <p>{building.description}</p>
              <a href={building.source} target="_blank" rel="noreferrer">
                형태·배치 출처 확인 ↗
              </a>
            </article>
          )}
          <nav aria-label="주요 시설">
            <ol className="facility-list">
              {geographicBuildings.map((b) => (
                <li key={b.id}>
                  <button
                    className={selected === b.id ? "selected" : ""}
                    aria-pressed={selected === b.id}
                    onClick={() => focus(b.id)}
                  >
                    <span className="number">
                      {String(b.officialNumber).padStart(2, "0")}
                    </span>
                    <span>{b.name}</span>
                    <span className="arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="estimate">
            <strong>지리 배치와 건축 표현의 기준</strong>
            <p>
              실제 위성영상과 지형 위에 건물 윤곽을 배치했습니다.
              지붕·높이·창문은 사진 해석에 따른 근사 모델이며 실측 재현은
              아닙니다.
            </p>
          </div>
          <p className="prototype-note">
            비공식 방문자용 시제품 · 위성영상 촬영 시점과 현재 모습은 다를 수
            있습니다.
          </p>
        </aside>
      </main>
      {reference && (
        <dialog
          ref={dialog}
          onCancel={() => setReference(false)}
          className="reference-dialog"
          aria-labelledby="reference-title"
        >
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">OFFICIAL REFERENCE</p>
              <h2 id="reference-title">공식 캠퍼스 안내도</h2>
            </div>
            <button autoFocus onClick={() => setReference(false)}>
              닫기
            </button>
          </div>
          <img
            src="/official-campus-map.jpg"
            alt="한국학중앙연구원 공식 캠퍼스 안내도"
          />
          <p>
            공식 사이트에서 확인한 안내도. 시설 식별에 사용하며 지도 배치는
            위성영상과 지리 좌표를 기준으로 합니다.
          </p>
          <a
            href="https://www.aks.ac.kr/com/cmm/EgovContentView.do?lang=kor&menuNo=5010182000"
            target="_blank"
            rel="noreferrer"
          >
            공식 안내도 확인 ↗
          </a>
        </dialog>
      )}
    </div>
  );
}
