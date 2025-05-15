5/16
- 미션 인증 사진 업로드 및 제출 기능 구현 (/dashboard/submit)
  - multer로 사진 업로드
  - mission_execution 및 certification 테이블에 연동 저장

- certification 테이블의 checked 컬럼을 기반으로 인증 상태 표시
  - 인증 안된 미션: '인증' 버튼 (투명)
  - 제출 후: '확인 중' 버튼 (노란색)
  - 관리자 승인 후: '완료' 버튼 (회색)

- 미션 목록 페이지 UI 분리
  - 미완료 미션과 완료 미션 구분하여 출력
  - EJS 반복문에서 mission_id 기준으로 certStatus 체크하여 표시

- 관리자 페이지 라우터 및 인증 승인 UI 추가
  - /admin/certifications: 승인 대기 인증 목록 확인
  - 인증 승인 버튼 클릭 시 checked = true 업데이트 처리

- 인증 완료 후 사용자에게 비료 획득 모달 표시
  - 인증 완료 감지 시 /dashboard/mission에서 모달 팝업
  - 일기 작성 페이지로 이동 가능

- layout.ejs에 하단 내비게이션 바 전역 삽입
  - 회원가입 페이지 제외 모든 페이지에 적용

- DB 연결 문제, 외래키 제약 조건 등 해결
  - mission_execution, certification, diary 테이블 관계 확인 및 수정
