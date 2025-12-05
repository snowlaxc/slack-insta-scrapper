# 📸 TSIS 인스타그램 알림 봇 (Slack Bot)

인스타그램 계정의 최신 게시물 이미지를 스크래핑하여, **매주 첫 영업일 오전 11시**에 슬랙으로 보내주는 봇입니다.
기본값은 `@tsis_coys` 계정이지만, `.env` 파일에서 다른 계정으로 변경할 수 있습니다! 🏖️


---

## 1. 슬랙 앱 설정 (필수)

봇을 실행하기 전에 Slack API 사이트에서 앱을 만들고 토큰을 발급받아야 합니다.

1. [Slack API Apps](https://api.slack.com/apps) 접속 후 **Create New App** 클릭 -> **From scratch** 선택.
2. 앱 이름(예: `TSIS Notifier`)과 워크스페이스 선택.
3. **Socket Mode** 메뉴 클릭:
   - **Enable Socket Mode**를 활성화(ON).
   - 토큰 이름 입력 후 생성. -> **`SLACK_APP_TOKEN`** (xapp-... 으로 시작) 복사해두기.
4. **OAuth & Permissions** 메뉴 클릭:
   - **Bot Token Scopes**에 다음 권한 추가:
     - `chat:write` (메시지 보내기)
     - `files:write` (파일 업로드)
     - `im:write` (DM 보내기)
     - `commands` (슬래시 커맨드 사용)
     - `im:history` (DM 메시지 읽기 - "설정" 텍스트 감지용)
   - **Install to Workspace** 클릭하여 앱 설치. -> **`SLACK_BOT_TOKEN`** (xoxb-... 으로 시작) 복사해두기.
5. **Basic Information** 메뉴 클릭:
   - **App Credentials** 섹션에서 **Signing Secret** -> **`SLACK_SIGNING_SECRET`** 복사해두기.
6. **Slash Commands** 메뉴 클릭:
   - **Create New Command** 클릭.
   - Command: `/tsis-setup`
   - Short Description: TSIS 알림 설정
   - Save 클릭.

---

## 2. 설치 및 설정

터미널에서 프로젝트 폴더(`slack-aiep-tsis`)로 이동한 후 진행해주세요.

### 1) 자동 설치 (권장)

`setup.sh` 스크립트를 실행하면 시스템 의존성(Chrome, Python 등)과 라이브러리를 한 번에 설치할 수 있습니다.

```bash
chmod +x setup.sh
./setup.sh
```

### 2) 환경 변수 설정

`.env.sample` 파일의 이름을 `.env`로 변경하고, 위에서 복사한 토큰들과 인스타그램 계정 정보를 입력하세요.
(인스타그램 로그인이 필요한 경우를 위해 계정 정보가 필요합니다.)

```bash
# .env 파일 내용 예시
SLACK_BOT_TOKEN=xoxb-1234...
SLACK_SIGNING_SECRET=abc1234...
SLACK_APP_TOKEN=xapp-1234...
PORT=3000

# Instagram 계정 설정
INSTAGRAM_USERNAME=your_instagram_id
INSTAGRAM_PASSWORD=your_instagram_pw
INSTAGRAM_PROFILE_URL=https://www.instagram.com/tsis_coys/

# 스크래핑 스케줄 설정 (cron 표현식)
# 기본값: 55 9 * * * (매일 오전 9시 55분)
SCRAPE_SCHEDULE=55 9 * * *

# 메시지 설정
MESSAGE_TITLE=Latest TSIS Post
MESSAGE_COMMENT=이번주 주간메뉴표입니다!
```

#### 환경변수 설명

- **INSTAGRAM_PROFILE_URL**: 스크래핑할 인스타그램 계정 URL (다른 계정으로 변경 가능)
- **SCRAPE_SCHEDULE**: 스크래핑 작업 실행 시간 (cron 표현식)
  - 예: `55 9 * * *` = 매일 오전 9시 55분
  - 예: `0 10 * * 1` = 매주 월요일 오전 10시
- **MESSAGE_TITLE**: 이미지 업로드 시 표시되는 제목
- **MESSAGE_COMMENT**: 이미지와 함께 전송되는 메시지


---

## 3. 실행 및 배포

이 봇은 **Socket Mode**를 사용하므로 외부로 포트를 열 필요가 없습니다. 인터넷이 되는 곳이라면 어디서든 실행 가능합니다.

### 1) 봇 실행 (기본)

```bash
npm run deploy
```

이제 봇이 백그라운드에서 실행됩니다! 터미널을 꺼도 봇은 계속 작동합니다.

---

## 4. 관리 및 자동 실행

### 1) 관리 명령어

- **상태 및 로그 확인**: `npm run logs`
- **봇 끄기**: `npm run stop`
- **봇 재시작**: `npm run restart`

### 2) 서버 재부팅 시 자동 실행 설정 (선택 사항)

컴퓨터가 꺼졌다가 켜져도 봇이 자동으로 실행되게 하려면 다음 순서를 **한 번만** 따라하세요.

1. 시작 프로그램 등록 명령어 생성:
   ```bash
   npm run startup
   ```
2. 위 명령어를 입력하면 터미널에 **"sudo env PATH=..."** 로 시작하는 긴 명령어가 나옵니다. 그 줄을 그대로 복사해서 터미널에 붙여넣고 엔터를 치세요.
3. 현재 실행 중인 봇 저장:
   ```bash
   npm run save
   ```

---

## 5. 사용 방법

슬랙에서 봇이 있는 채널이나 DM으로 이동하세요.

1. **설정하기**:
   - 채팅창에 `/tsis-setup` 입력 후 엔터.
   - 또는 봇에게 DM으로 "설정"이라고 메시지 전송.
2. **구독 확인**:
   - "구독하기" 버튼을 클릭하면 구독이 완료됩니다.
   - 매주 **첫 영업일 오전 11시**에 자동으로 알림을 받게 됩니다.
   - 공휴일은 자동으로 제외됩니다. 🏖️
3. **완료**:
   - 설정이 저장되면 봇이 확인 메시지를 보내고, 최신 게시물 이미지를 즉시 전송합니다! 📸

## 6. 다른 인스타그램 계정 사용하기

`.env` 파일의 `INSTAGRAM_PROFILE_URL`을 변경하면 다른 인스타그램 계정의 게시물도 스크래핑할 수 있습니다:

```bash
# 예시: 다른 계정으로 변경
INSTAGRAM_PROFILE_URL=https://www.instagram.com/another_account/
MESSAGE_TITLE=Another Account Post
MESSAGE_COMMENT=새로운 게시물입니다!
```

변경 후 봇을 재시작하면 적용됩니다:
```bash
npm run restart
```

