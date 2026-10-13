import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { geographicBuildings } from "./data/geographic-buildings";
import type { LifeState, WorldStats } from "./campus-life";
const Scene = lazy(() => import("./Scene"));
export type Command = {
  type:
    | "reset"
    | "top"
    | "oblique"
    | "left"
    | "right"
    | "in"
    | "out"
    | "focus"
    | "people"
    | "traffic"
    | "neighborhood";
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
  const [life, setLife] = useState<LifeState>(() => ({
    surroundings: true,
    people: true,
    traffic: true,
    playing: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  const [worldStats, setWorldStats] = useState<WorldStats>({
    surroundings: 0,
    people: 0,
    cars: 0,
    buses: 0,
    loading: true,
  });
  const [simulationExpanded, setSimulationExpanded] = useState(
    () => window.matchMedia("(min-width: 701px)").matches,
  );
  const [reference, setReference] = useState(false);
  const [status, setStatus] = useState(
    "위성영상과 실제 지형을 연결하고 있습니다…",
  );
  const [failure, setFailure] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  const facilityPanel = useRef<HTMLElement>(null);
  const mapRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    if (worldStats.error) setSimulationExpanded(true);
  }, [worldStats.error]);
  useEffect(() => {
    if (!selected) return;
    if (window.matchMedia("(max-width: 700px)").matches) {
      mapRegion.current?.scrollIntoView({ block: "start", behavior: "auto" });
    } else {
      facilityPanel.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [selected]);
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
  const viewLife = (type: "people" | "traffic" | "neighborhood") => {
    setSelected(undefined);
    setLife((current) => ({
      ...current,
      [type === "neighborhood" ? "surroundings" : type]: true,
    }));
    send(type);
  };
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
          ref={mapRegion}
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
                    life={life}
                    onWorldStats={setWorldStats}
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
              <br /> 한국학의 공간
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
                checked={life.surroundings}
                onChange={(e) =>
                  setLife((s) => ({ ...s, surroundings: e.target.checked }))
                }
              />{" "}
              주변 건물
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
          <div
            className="simulation-controls"
            aria-label="가상 보행과 교통 제어"
          >
            <div className="simulation-heading">
              <span
                className={
                  life.playing ? "activity-dot active" : "activity-dot"
                }
                aria-hidden="true"
              />
              <strong>움직이는 캠퍼스</strong>
              <button
                className="playback"
                disabled={worldStats.loading || !!worldStats.error}
                onClick={() => setLife((s) => ({ ...s, playing: !s.playing }))}
              >
                {life.playing ? "일시정지" : "재생"}
              </button>
              <button
                className="simulation-disclosure"
                aria-expanded={simulationExpanded}
                aria-controls="simulation-detail"
                aria-label={
                  simulationExpanded ? "동작 설정 접기" : "동작 설정 펼치기"
                }
                onClick={() => setSimulationExpanded((v) => !v)}
              >
                {simulationExpanded ? "−" : "+"}
              </button>
            </div>
            <div id="simulation-detail" hidden={!simulationExpanded}>
              <div className="simulation-layers">
                <label>
                  <input
                    type="checkbox"
                    checked={life.people}
                    onChange={(e) =>
                      setLife((s) => ({ ...s, people: e.target.checked }))
                    }
                  />{" "}
                  사람{" "}
                  <span>{worldStats.loading ? "…" : worldStats.people}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={life.traffic}
                    onChange={(e) =>
                      setLife((s) => ({ ...s, traffic: e.target.checked }))
                    }
                  />{" "}
                  버스·승용차{" "}
                  <span>
                    {worldStats.loading
                      ? "…"
                      : worldStats.cars + worldStats.buses}
                  </span>
                </label>
              </div>
              <div className="simulation-views">
                <button
                  disabled={worldStats.loading || !!worldStats.error}
                  onClick={() => viewLife("people")}
                >
                  산책길 보기
                </button>
                <button
                  disabled={worldStats.loading || !!worldStats.error}
                  onClick={() => viewLife("traffic")}
                >
                  버스 보기
                </button>
                <button
                  disabled={worldStats.loading || !!worldStats.error}
                  onClick={() => viewLife("neighborhood")}
                >
                  주변 보기
                </button>
              </div>
              <p>
                {worldStats.error ??
                  "가상 보행·교통 · 실제 운행 정보가 아닙니다"}
              </p>
            </div>
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
            <span className="gesture-desktop">
              드래그 이동 · 우클릭/휠 확대 · Ctrl+드래그 회전
            </span>
            <span className="gesture-touch">
              한 손가락 이동 · 두 손가락 확대·회전
            </span>
          </p>
        </section>
        <aside className="facility-panel" ref={facilityPanel}>
          <div className="panel-heading">
            <p className="eyebrow">EXPLORE THE CAMPUS</p>
            <h2>
              전체 시설{" "}
              <span className="facility-count">
                {geographicBuildings.length}
              </span>
            </h2>
            <p>시설을 선택해 실제 위치로 이동합니다.</p>
            {!worldStats.loading && !worldStats.error && (
              <p className="world-count">
                주변 {worldStats.surroundings}동 · 보행자 {worldStats.people}명
                · 광역버스 {worldStats.buses}대
              </p>
            )}
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
              아닙니다. 주변 건물은 OSM·Overture 공개 윤곽을 사용하며, 미확인
              높이·입면은 추정했습니다.
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
