# mint-cocoa.github.io

배진후 포트폴리오의 메인 진입점(Hub) 역할만 담당하는 React + Vite 기반 랜딩 페이지입니다.

이 저장소는 대표 허브만 빌드합니다. 실제 상세 기술 문서(C++ 웹 서버, 게임 클라이언트, DevOps 등)는 [mint-cocoa/portfolio](https://github.com/mint-cocoa/portfolio) 리포지토리에서 관리하며, 공개 canonical 경로는 `https://mint-cocoa.github.io/portfolio/`입니다.

## 주요 링크

- **대표 허브 (현재 레포):** [https://mint-cocoa.github.io/](https://mint-cocoa.github.io/)
- **상세 포트폴리오:** [https://mint-cocoa.github.io/portfolio/](https://mint-cocoa.github.io/portfolio/)
- **홈랩 미러:** [https://portfolio.mintcocoa.cc/](https://portfolio.mintcocoa.cc/)
- **홈랩 상세 문서 미러:** [https://portfolio.mintcocoa.cc/portfolio/](https://portfolio.mintcocoa.cc/portfolio/)
- **상세 문서 소스:** [mint-cocoa/portfolio](https://github.com/mint-cocoa/portfolio)

## 프로젝트 구조

```text
.
├── .github/workflows/
│   └── pages-deploy.yml  # 허브 앱만 빌드해 GitHub Pages에 배포
├── src/
│   ├── assets/           # 허브 화면에서 직접 쓰는 이미지
│   ├── main.tsx          # 메인 허브 UI와 외부 상세 링크
│   └── styles.css        # 허브 전용 스타일
├── index.html            # Vite 진입점
├── package.json          # React/Vite 의존성과 npm scripts
├── package-lock.json     # npm lockfile
├── tsconfig.json         # TypeScript 설정
└── vite.config.ts        # Vite 빌드 설정, 출력 경로는 _site/
```

역할을 분리하기 위해 이 저장소에는 `portfolio` 레포의 `docs/` 산출물을 포함하지 않습니다. 상세 문서의 생성, Pages 배포, 컨테이너 이미지, Ops API, Kubernetes 배포 파일은 `mint-cocoa/portfolio`에서 관리합니다. `portfolio.mintcocoa.cc`는 이 허브를 C++ RuntimeWeb 컨테이너로 서빙하는 홈랩 미러이며, 상세 문서는 같은 호스트의 `/portfolio/` 아래에서 제공합니다.

## 로컬 개발 및 빌드

빠르게 띄워볼 수 있도록 단순화하였습니다.

```bash
# 의존성 설치
npm ci

# 로컬 개발 서버 접속
npm run dev

# 프로덕션 빌드 및 로컬 프리뷰
npm run build
npm run preview -- --port 4173
```

## GitHub Actions 배포 (CI/CD)

`main` 브랜치에 코드가 푸시되면 `.github/workflows/pages-deploy.yml` 워크플로우를 통해 자동으로 빌드 및 배포됩니다.

1. **Setup Node**: Node.js 22버전 환경 구성
2. **Install**: `npm ci` 의존성 설치
3. **Build**: `npm run build` 스크립트를 통해 `_site/` 디렉터리에 정적 파일 번들링
4. **Deploy**: 허브 앱 아티팩트만 GitHub Pages로 릴리즈
