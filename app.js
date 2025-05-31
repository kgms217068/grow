// app.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// DB 연결 설정 (예: db.js 참고)
const db = require('./db/db'); // db.js에서 mysql2/promise로 connection 풀 만들었을 경우

// Session 설정
const sessionStore = new MySQLStore({}, db.promisePool);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const expressLayouts = require('express-ejs-layouts');  
app.use(expressLayouts);                                
app.set('layout', 'layout'); 

// 미들웨어
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  key: 'user_sid',
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
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
const homeRouter = require('./routes/home');
const scrapRouter = require('./routes/scrap');

app.use('/', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/diary', diaryRouter);
app.use('/collection', collectionRouter);
app.use('/community', communityRouter);
app.use('/market', marketRouter);
app.use('/mypage', mypageRouter);
app.use('/home', homeRouter);
app.use('/scrap', scrapRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.render('index');
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});


module.exports = app;
