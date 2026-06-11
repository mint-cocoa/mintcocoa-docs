# mintcocoa-docs

배진후 포트폴리오의 메인 진입점(Hub)과 상세 문서를 함께 빌드하는 React + Vite 기반 랜딩 페이지입니다.

통합 저장소의 canonical production 경로는 `https://docs.mintcocoa.dev/`이며, 상세 기술 문서는 `/portfolio/` 아래에서 제공합니다.

## 주요 링크

- **대표 문서 허브:** [https://docs.mintcocoa.dev/](https://docs.mintcocoa.dev/)
- **상세 포트폴리오:** [https://docs.mintcocoa.dev/portfolio/](https://docs.mintcocoa.dev/portfolio/)
- **GitHub Pages 미러:** [https://mint-cocoa.github.io/mintcocoa-docs/](https://mint-cocoa.github.io/mintcocoa-docs/)
- **통합 문서 소스:** [mint-cocoa/mintcocoa-docs](https://github.com/mint-cocoa/mintcocoa-docs)

## 프로젝트 구조

```text
.
├── .github/workflows/
│   └── pages.yml         # 문서 사이트를 빌드해 Pages와 OKE 이미지로 배포
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

이 저장소는 허브와 상세 문서 산출물을 함께 만들고, GitHub Pages 미러와 OCI OKE production 컨테이너 이미지를 동시에 배포합니다.

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

`main` 브랜치에 코드가 푸시되면 `.github/workflows/pages.yml` 워크플로우를 통해 자동으로 빌드 및 배포됩니다.

1. **Setup Node**: Node.js 24버전 환경 구성
2. **Install**: `npm ci` 의존성 설치
3. **Build**: `npm run build` 스크립트를 통해 `_site/` 디렉터리에 정적 파일 번들링
4. **Image**: `_site/`를 포함한 `ghcr.io/mint-cocoa/mintcocoa-docs` 이미지 push
5. **Deploy**: GitHub Pages 미러 배포와 OKE GitOps promotion 수행
