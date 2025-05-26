// app.js
const express = require('express');
const path = require('path');

const dotenv = require('dotenv');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;




// DB 연결 설정 (예: db.js 참고)
const db = require('./db/db'); // db.js에서 mysql2/promise로 connection 풀 만들었을 경우

// Session 설정
const sessionStore = new MySQLStore({}, db.promisePool);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});


// 미들웨어
app.use(expressLayouts);
app.set('layout', 'layout'); // 기본 layout 지정





app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  key: 'user_sid',
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: true,
  store: sessionStore
}));



// 라우터 등록
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const diaryRouter = require('./routes/diary');
const collectionRouter = require('./routes/collection');
const communityRouter = require('./routes/community');
const marketRouter = require('./routes/market');
const mypageRouter = require('./routes/mypage');
const adminRouter = require('./routes/admin');
const inventoryRouter = require('./routes/inventory');




app.use(session({
  secret: 'your-dev-secret', // 진짜 배포 시엔 환경변수로
  resave: false,
  saveUninitialized: false
}));

// 💡 테스트용 가짜 로그인 (임시로 모든 요청에 유저ID를 넣어줌)
app.use((req, res, next) => {
  req.session.userId = 1;  // user_id 1번 강제 사용
  next();
});


app.use('/', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/diary', diaryRouter);
app.use('/collection', collectionRouter);
app.use('/community', communityRouter);
app.use('/market', marketRouter);
app.use('/mypage', mypageRouter);
app.use('/admin', adminRouter);
app.use('/inventory', inventoryRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.render('index');
});

require('./scheduler/levelUpScheduler');

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
