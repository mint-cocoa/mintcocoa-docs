import { createRoot } from "react-dom/client";
import {
  Activity,
  ExternalLink,
  Github,
  Layers3,
  MonitorPlay,
  Server,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./styles.css";

type Icon = LucideIcon;

type WorkItem = {
  eyebrow: string;
  title: string;
  icon: Icon;
  thumbnail?: string;
  summary: string;
  detailUrl: string;
  repoUrl?: string;
  repoName?: string;
  chips: string[];
  extraLinks?: {
    label: string;
    href: string;
    icon: Icon;
  }[];
  group?: "server-app";
};

const clientThumbnailUrl = "https://img.youtube.com/vi/pnr0sobe3ug/maxresdefault.jpg";
const liveOpsDashboardUrl = "/portfolio/devops/OpsDashboard.html";
const serverThumbnailUrl = "/thumbnails/server-core-iouring-section.png";
const devopsThumbnailUrl = "/thumbnails/devops-dashboard.png";

const workItems: WorkItem[] = [
  {
    eyebrow: "Server Core",
    title: "io_uring 런타임",
    icon: Server,
    thumbnail: serverThumbnailUrl,
    summary:
      "io_uring 기반의 C++ 라이브러리/ 런타임",
    detailUrl: "/portfolio/server/ServerCorePortfolio.html#sec-iouring",
    repoUrl: "https://github.com/mint-cocoa/iouring-runtime",
    repoName: "iouring-runtime",
    chips: ["소켓", "세션 수명", "버퍼", "워커 루프"],
  },
  {
    eyebrow: "RuntimeWeb",
    title: "웹 서버",
    icon: Server,
    summary:
      "RuntimeWeb 위에서 HTTP 라우팅, 파일 서빙, 운영용 웹 앱 예제 ",
    detailUrl: "/portfolio/server/RuntimeWebPortfolio.html",
    repoUrl: "https://github.com/mint-cocoa/iouring-runtime",
    repoName: "iouring-runtime",
    chips: ["dropapp", "webhook_inbox", "speedtest", "file_store"],
    group: "server-app",
  },
  {
    eyebrow: "RuntimeProxy",
    title: "리버스 프록시 서버",
    icon: Server,
    summary:
      "RuntimeProxy 위에서 TCP 리버스 프록시, TLS 종료, SNI 기반 라우팅을 검증했습니다.",
    detailUrl: "/portfolio/server/RuntimeProxyPortfolio.html",
    repoUrl: "https://github.com/mint-cocoa/iouring-runtime",
    repoName: "iouring-runtime",
    chips: ["업스트림 포워딩", "도메인 라우팅", "프록시 메트릭"],
    group: "server-app",
  },
  {
    eyebrow: "RuntimeGame",
    title: "멀티플레이 게임 서버",
    icon: Server,
    summary:
      "PacketSession, Room, RoomManager로 패킷 처리와 룸 단위 게임 서버 구조를 구성했습니다.",
    detailUrl: "/portfolio/server/RuntimeGamePortfolio.html",
    repoUrl: "https://github.com/mint-cocoa/iouring-runtime",
    repoName: "iouring-runtime",
    chips: ["프로토콜", "네트워크 동기화", "Zone 생명주기", "세션 라우팅"],
    group: "server-app",
  },
  {
    eyebrow: "DevOps / Live Ops",
    title: "홈랩 DevOps와 운영 대시보드",
    icon: Activity,
    thumbnail: devopsThumbnailUrl,
    summary:
      "C++ 런타임 기반 앱을 GitOps, Argo CD, Kubernetes로 배포하고 Ops API 대시보드에서 상태를 확인합니다.",
    detailUrl: "/portfolio/devops/DevOpsPortfolio.html",
    chips: ["인프라", "배포 흐름", "워크로드", "인그레스", "관측성"],
    extraLinks: [
      {
        label: "Ops Dashboard",
        href: liveOpsDashboardUrl,
        icon: Activity,
      },
    ],
  },
  {
    eyebrow: "Client Document",
    title: "멀티플레이 던전 RPG 클라이언트",
    icon: MonitorPlay,
    thumbnail: clientThumbnailUrl,
    summary:
      "C++ DirectX 11 클라이언트의 렌더링, 네트워크, 씬 전환, 전투/상호작용 구조를 정리했습니다.",
    detailUrl: "/portfolio/client/ClientPortfolio.html",
    repoUrl: "https://github.com/mint-cocoa/game-client",
    repoName: "game-client",
    chips: ["/portfolio 문서", "서버 문서 연계", "클라이언트 상세"],
  },
];

const serverAppItems = workItems.filter((item) => item.group === "server-app");
const primaryWorkItems = workItems.filter((item) => item.group !== "server-app");

function App() {
  return (
    <div className="app-shell">
      <main>
        <section className="section projects-section">
          <div className="section-title project-title">
            <p>
              <Layers3 size={17} />
              Core Projects
            </p>
            <h1>주요 프로젝트</h1>
          </div>
          <div className="project-intro">
            <p className="section-lead">
                  C++ io_uring 런타임을 중심으로 서버와 게임 클라이언트 개발, 홈랩 DevOps까지 진행했던 여러 프로젝트
            </p>
          </div>
          <div className="work-grid">
            {primaryWorkItems.map((item) => (
              <div className="work-group" key={item.title}>
                <article className={`work-card${item.thumbnail ? " has-thumbnail" : ""}${item.eyebrow === "Server Core" ? " server-core-card" : ""}`}>
                  {item.thumbnail ? (
                    <div className="work-card-thumbnail">
                      <img src={item.thumbnail} alt="" aria-hidden="true" />
                    </div>
                  ) : null}
                  <div className="work-card-body">
                    <p className="card-eyebrow">
                      <item.icon size={17} />
                      {item.eyebrow}
                    </p>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                    <ul className="chip-list" aria-label={`${item.title} 핵심 항목`}>
                      {item.chips.map((chip) => (
                        <li key={chip}>{chip}</li>
                      ))}
                    </ul>
                    <div className="doc-link-row" aria-label={`${item.title} 문서 경로`}>
                      <a className="primary-cta" href={item.detailUrl} target="_blank" rel="noreferrer">
                        상세 문서 <ExternalLink size={15} />
                      </a>
                      {item.repoUrl && item.repoName ? (
                        <a href={item.repoUrl} target="_blank" rel="noreferrer">
                          GitHub: {item.repoName} <Github size={15} />
                        </a>
                      ) : null}
                      {item.extraLinks?.map((link) => (
                        <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>
                          {link.label} <link.icon size={15} />
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
                {item.eyebrow === "Server Core" ? (
                  <div className="server-app-grid" aria-label="서버 예제 애플리케이션 문서">
                    {serverAppItems.map((app) => (
                      <article className="server-app-card" key={app.title}>
                        <p className="card-eyebrow">
                          <app.icon size={17} />
                          {app.eyebrow}
                        </p>
                        <h3>{app.title}</h3>
                        <p>{app.summary}</p>
                        <ul className="chip-list compact" aria-label={`${app.title} 핵심 항목`}>
                          {app.chips.map((chip) => (
                            <li key={chip}>{chip}</li>
                          ))}
                        </ul>
                        <div className="doc-link-row compact" aria-label={`${app.title} 문서 경로`}>
                          <a className="primary-cta" href={app.detailUrl} target="_blank" rel="noreferrer">
                            상세 문서 <ExternalLink size={15} />
                          </a>
                          <a href={app.repoUrl} target="_blank" rel="noreferrer">
                            GitHub <Github size={15} />
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© 배진후</span>
        <a href="https://github.com/mint-cocoa/mint-cocoa.github.io" target="_blank" rel="noreferrer">
          mint-cocoa.github.io
        </a>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
