// app.js

import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import messagesRouter from './routes/messages.js';
import passport from "passport";
import session from "express-session";
import passportConfig from "./util/scrypt.js";

const app = express();

app.use(cors( {
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, "router")));
app.use(express.static('router'));

// Bootstrap bypass
app.use("/bootstrap", express.static(path.join(
    import.meta.dirname, "node_modules", "bootstrap", "dist"
)))

// axios bypass
app.use("/axios", express.static(path.join(
    import.meta.dirname, "node_modules", "axios", "dist"
)));

// ExpressアプリケーションでPassportとセッションを使用するための設定
app.use(session({
    secret: "RWmzrePkh3mkA3oFHmR+JCpl/8lDolml39sCVH/44aiKsNC0",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000, httpOnly: false } // セッションの有効期限を設定（ミリ秒）
}));
app.use(passport.authenticate("session"));
// app.use(passportConfig(passport));
passportConfig(passport);

app.use('/', indexRouter);
app.use("/users", usersRouter);
app.use("/messages", messagesRouter);


app.use((req, res, next) => {
    res.status(401).json({ message: "unauthenticated" });
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json({ error: err.message });
});

export default app;
