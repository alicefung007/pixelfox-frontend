# pixelfox

[English](README.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

PixelFox는 React, TypeScript, shadcn/ui로 만든 현대적인 픽셀 아트 / 비즈 도안 편집기 인터페이스입니다([pixelfox.art](https://pixelfox.art)).

## 비즈니스 개요

현재 PixelFox 코드는 클라이언트 사이드에서 동작하는 도안 편집 워크스페이스를 구현합니다. 핵심 흐름은 다음과 같습니다.

1. 빈 캔버스를 만들거나 이미지를 업로드합니다.
2. 이미지를 지정 팔레트로 제한된 픽셀 / 비즈 그리드로 변환하거나, 직접 그리고 편집합니다.
3. 시스템 팔레트, 캔버스 사용 색상, 색상 교체, 색상 삭제로 도안 색상을 관리합니다.
4. 작품을 미리 보고, 브랜드 정보와 색상 통계가 포함된 PNG 도안을 내보내거나, 조립 모드에서 색상별로 단계적으로 완성합니다.

현재 코드베이스에는 백엔드 비즈니스 API가 없습니다. 캔버스 데이터, 편집기 설정, 팔레트 설정, 내보내기 설정, 조립 진행 상황은 모두 브라우저 `localStorage`에 저장됩니다.

## 기술 스택

- **프레임워크**: React 19
- **빌드 도구**: Vite
- **언어**: TypeScript
- **스타일**: Tailwind CSS v4
- **컴포넌트**: shadcn/ui (Radix UI)
- **상태 관리**: Zustand
- **라우팅**: React Router v7
- **i18n**: i18next
- **3D 미리보기**: Three.js, React Three Fiber, drei

## 라우트 구조

- `/`: 메인 편집기 페이지입니다. 캔버스, 사이드바 도구, 팔레트 패널, 업로드 다이얼로그, 3D 미리보기, 내보내기, 색상 교체 다이얼로그를 포함합니다.
- `/assembly`: 독립 조립 페이지입니다. 조립 흐름을 전체 화면으로 열고, 닫으면 `/`로 돌아갑니다.

`AppLayout`은 애플리케이션 셸입니다. 내비게이션 바와 전역 toast를 렌더링하고, 업로드, 내보내기, 이미지 생성 관련 공유 상태를 React Router outlet context로 페이지에 전달합니다.

## 핵심 비즈니스 로직

### 캔버스 편집

캔버스 상태는 `src/store/useEditorStore.ts`에 집중되어 있습니다.

- `pixels`는 커밋된 픽셀 맵입니다. key는 `"x,y"`, value는 hex 색상입니다.
- `pixelBuffer`는 고빈도 그리기에 최적화된 `Uint32Array`입니다. 브러시와 지우개는 먼저 buffer에 쓰고, `saveHistory()`가 buffer를 `pixels`로 동기화합니다.
- 캔버스 기본 크기는 `30 x 30`이며, 너비와 높이는 각각 `1..200` 비즈 셀로 제한됩니다.
- 실행 취소 / 다시 실행 히스토리는 `{ pixels, width, height }` 스냅샷을 저장하며, 메모리에 최대 30개를 유지합니다.
- 현재 캔버스 스냅샷은 `pixelfox-editor-canvas-storage`에 저장됩니다. 큰 캔버스에서 무거운 `localStorage` 쓰기를 피하기 위해 전체 히스토리 저장은 기본적으로 비활성화되어 있습니다.
- 현재 도구, 기본 색상, 배경색, 줌 같은 편집기 설정은 `pixelfox-editor-storage`에 저장됩니다.

캔버스 렌더링과 상호작용은 `src/components/editor/PixelCanvas.tsx`와 `src/components/editor/pixel-canvas/` 아래 hooks가 함께 처리합니다.

- 브러시와 지우개는 포인터 이동점을 보간해 빠른 드래그 중 끊김을 방지합니다.
- 페인트통은 flood fill을 사용해 같은 색 영역 또는 연결된 빈 셀을 채웁니다.
- 스포이드는 현재 픽셀 색상을 선택한 뒤 자동으로 브러시 도구로 돌아갑니다.
- 마술봉은 연결된 같은 색 영역을 선택하고 삭제 / 교체 액션을 제공합니다.
- 손 도구, 휠, 핀치 제스처, 툴바 컨트롤로 화면 이동과 확대 / 축소를 지원합니다.
- 캔버스 가장자리 리사이즈 핸들로 특정 방향에서 크기를 바꾸고, 기존 픽셀을 이동하거나 잘라냅니다.

### 이미지 업로드와 픽셀화

업로드 흐름은 `src/components/editor/UploadPhotoDialog.tsx`와 `src/lib/image-processor.ts`에서 구현됩니다.

사용자는 이미지를 업로드하고, 출력 크기, 가로세로 비율 잠금 / 해제, 이미지 뒤집기 / 회전, 배경 가장자리 자르기, 시스템 팔레트, 색상 병합 강도를 설정할 수 있습니다.

`convertImageToPixelArt()` 변환 과정:

1. 원본 이미지를 오프스크린 canvas에 로드합니다.
2. 목표 비즈 크기로 리사이즈합니다.
3. `poolSize`에 따라 로컬 픽셀을 풀링하고, 각 풀에서 가장 자주 등장한 보이는 색상을 선택합니다.
4. RGB 색상을 Lab 색공간으로 변환합니다.
5. CIEDE2000 색차와 k-d tree로 가장 가까운 팔레트 색상을 찾습니다.
6. 색상 병합 임계값이 0보다 크면 BFS로 인접하고 색차가 가까운 영역을 병합해 영역 대표 색상으로 통일합니다.
7. `ImageData`, 너비, 높이, 비즈 수, 팔레트 id를 반환합니다.

`AppLayout.handleGenerate()`는 변환 결과를 받아 투명하지 않은 픽셀을 편집기 상태에 쓰고, 캔버스 크기를 조정하며, 현재 시스템 팔레트를 바꾸고, 현재 그리기 색상을 대상 팔레트의 가장 가까운 색상으로 다시 매핑한 뒤 히스토리를 저장하고 “사용 색상” 탭을 강조합니다.

### 팔레트와 색상 관리

팔레트 상태는 `src/store/usePaletteStore.ts`에 집중되어 있습니다.

- `currentPaletteId`는 `src/lib/palettes/`의 시스템 팔레트를 가리킵니다.
- `usedColors`와 `recentColors`는 저장되며 개수 제한이 있습니다.
- `activeTab`은 팔레트 패널이 전체 색상을 보여줄지 캔버스 사용 색상을 보여줄지 제어합니다.
- `selectedUsedColor`는 교체 또는 삭제 대상으로 선택된 사용 색상입니다.

`src/components/palette/PalettePanel.tsx`는 주요 팔레트 워크플로를 담당합니다.

- “전체 색상” 탭은 현재 시스템 팔레트의 모든 스와치를 표시합니다.
- “사용 색상” 탭은 현재 캔버스 스냅샷에서 색상과 수량을 계산합니다.
- 스와치를 클릭하면 편집기 기본 색상이 업데이트됩니다.
- 사용 색상을 삭제하면 캔버스에서 일치하는 모든 픽셀을 제거하고 히스토리를 저장합니다.
- 한 사용 색상을 다른 사용 색상 위로 드래그하면 원본 색상의 모든 픽셀이 대상 색상으로 교체됩니다.
- 현재 캔버스 색상을 포함하지 않는 팔레트로 바꾸려 하면 확인 다이얼로그가 열립니다. 계속 진행하면 캔버스를 비운 뒤 팔레트를 전환합니다.

색상 교체 로직은 `src/lib/palette-replace.ts`에 집중되어 있습니다. hex 색상 정규화, 선택 픽셀 범위 제한, 캔버스 픽셀 업데이트, 히스토리 저장, 필요 시 교체 색상 선택을 처리합니다.

### 도안 내보내기

`src/components/editor/ExportPatternDialog.tsx`는 현재 캔버스를 브랜드가 포함된 PNG 도안으로 내보냅니다.

내보내기 옵션:

- 비어 있지 않은 픽셀 영역으로 자동 자르기
- 흰색 또는 투명 배경
- 주요 / 보조 그리드선
- 그리드 간격과 색상
- 좌표축
- 셀별 색상 코드
- 미러 반전
- 색상 코드와 사용 통계에서 거의 흰색인 색상 제외

내보내기 렌더러는 다음 내용을 담은 canvas 이미지를 생성합니다.

- 픽셀 그리드 본문
- 선택 가능한 좌표축과 그리드선
- `public/logo_with_name.png` 또는 `public/logo.png`를 사용하는 브랜드 헤더
- 팔레트, 크기, 비즈 수, 사이트 도메인 같은 요약 정보
- 사용량순으로 정렬된 색상 통계 배지

캔버스가 비어 있으면 사이드바의 내보내기 버튼은 비활성화됩니다.

### 조립 모드

`src/components/editor/AssemblyDialog.tsx`는 현재 도안을 색상별로 조립하기 위한 단계별 가이드를 제공합니다.

- 캔버스 픽셀을 정규화된 색상별로 집계합니다.
- 각 색상을 현재 팔레트 라벨에 매핑하고, 팔레트 라벨이 없으면 대체 라벨을 사용합니다.
- 단계는 비즈 수 내림차순, 그다음 라벨순으로 정렬됩니다.
- 미리보기는 현재 단계 색상만 강조하고 다른 색상은 흐리게 표시합니다.
- 사용자는 색상 완료 표시, 단계 이동, 미리보기 확대 / 축소와 이동, 미러 반전, 그리드 / 좌표축 / 색상 코드 표시, 거의 흰색 배경 같은 색상 제외를 사용할 수 있습니다.
- 진행 상황은 도안 서명별로 저장됩니다. 서명은 팔레트 id, 캔버스 크기, 픽셀 내용 hash로 만들어져 현재 구체적인 도안에만 연결됩니다.
- 제외되지 않은 모든 색상이 완료되면 완료 다이얼로그가 표시되고 confetti 효과가 실행됩니다.

### 3D 미리보기

`src/components/editor/Preview3DDialog.tsx`는 Three.js를 사용해 현재 픽셀 그리드를 3D 비즈 미리보기로 렌더링합니다. 비즈 형태 관련 상수는 `src/lib/constants.ts`의 `PREVIEW_3D_CONFIG`에 정의되어 있습니다.

### 국제화와 테마

- i18n 설정은 `src/i18n/config.ts`에 있습니다.
- 번역 파일은 `src/i18n/locales/`에 있으며, 현재 영어, 중국어, 한국어, 일본어를 지원합니다.
- 테마 전환은 `src/components/theme-provider.tsx`가 관리하고 내비게이션 바에서 사용할 수 있습니다.

## 주요 파일

- `src/App.tsx`: 라우트 정의.
- `src/components/layout/AppLayout.tsx`: 애플리케이션 셸과 이미지 생성 결과 전달.
- `src/pages/Editor.tsx`: 메인 편집기 구성.
- `src/pages/Assembly.tsx`: 독립 조립 라우트.
- `src/store/useEditorStore.ts`: 캔버스, 도구, 히스토리, 저장, 다이얼로그 상태.
- `src/store/usePaletteStore.ts`: 팔레트, 최근 / 사용 색상, 팔레트 패널 UI 상태.
- `src/lib/image-processor.ts`: 이미지 픽셀화와 팔레트 매칭 알고리즘.
- `src/lib/palettes/`: 내장 팔레트 정의.
- `src/components/editor/PixelCanvas.tsx`: 캔버스 렌더링과 상호작용 조율.
- `src/components/palette/PalettePanel.tsx`: 팔레트 탭, 사용 색상 액션, 팔레트 전환.
- `src/components/editor/ExportPatternDialog.tsx`: 도안 이미지 렌더링과 다운로드.
- `src/components/editor/AssemblyDialog.tsx`: 색상별 조립 흐름.

## 로컬 실행

1. 저장소를 클론합니다.
2. 의존성을 설치합니다.

   ```bash
   pnpm install
   ```

3. 개발 서버를 시작합니다.

   ```bash
   pnpm dev
   ```

## 개발 명령

- `pnpm dev`: 개발 서버 시작.
- `pnpm build`: 프로덕션 빌드.
- `pnpm lint`: ESLint 실행.
- `pnpm format`: Prettier로 코드 포맷.
- `pnpm typecheck`: TypeScript 타입 검사 실행.
