// routes/users.js
import express from "express";
import passport from "passport";
import { check, validationResult } from "express-validator";
import { generateSalt, calcHash } from "../util/scrypt.js"; // scrypt モジュールをインポート
import LocalStrategy from "passport-local";
import { PrismaClient } from "@prisma/client";
import { timingSafeEqual } from "crypto";
import session from "express-session"; // crypto モジュールから timingSafeEqual 関数をインポート

const router = express.Router();
const prisma = new PrismaClient();

// express-sessionを初期化
router.use(session({
  secret: "secret", // 任意の文字列
  resave: false,
  saveUninitialized: false
}));

router.use(passport.initialize()); // Passportを初期化
router.use(passport.session());

router.get("/", (req, res, next) => {
  if (!req.user) {
    const err = new Error("ログインしていないよ？");
    err.status = 401;
    throw err;
  }
  res.json
})

/* GET users listing. */
router.get("/", (req, res, next) => {
  res.redirect("/users/login");
});

passport.use(new LocalStrategy(
    { usernameField: "name", passwordField: "password" },
    async (username, password, cb) => {
      try {
        const user = await prisma.user.findUnique({
          where: { name: username }
        });
        if (!user) {
          return cb(null, false, { message: "ユーザ名かパスワードが違います" });
        }
        const hashedPassword = calcHash(password, user.salt);
        if (!timingSafeEqual(Buffer.from(user.password), Buffer.from(hashedPassword))) {
          return cb(null, false, { message: "ユーザ名かパスワードが違います" });
        }
        return cb(null, user);
      } catch (e) {
        return cb(e);
      }
    }
));

passport.serializeUser((user, done) => {
  done(null, user); // セッションにユーザーオブジェクトを保存
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: id }
    });
    done(null, user); // ユーザー情報をreq.userに格納
  } catch (e) {
    done(e);
  }
});

router.post("/login", passport.authenticate("local", {
  // successReturnToOrRedirect: "/",
  failureRedirect: "/users/login",
  failureMessage: true,
  keepSessionInfo: true
}), (req, res, next) => {
  // ログイン成功時の処理
  res.status(200).json({ message: "ログインに成功しました！" });
});


router.post("/signup", [
  check("name", "名前の入力は必須です").notEmpty(),
  check("pass", "パスワードの入力は必須です").notEmpty(),
], async (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: "名前とパスワードを入力してください。" });
  }

  const { name, pass } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { name }
    });

    if (existingUser) {
      return res.status(400).json({ message: "ユーザー名は既に使用されています。別のユーザー名を選択してください。" });
    }

    const salt = generateSalt();
    const hashedPassword = calcHash(pass, salt);

    await prisma.user.create({
      data: {
        name,
        pass: hashedPassword,
        salt
      }
    });

    res.status(201).json({
      message: "created！"
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).json({ message: "ユーザーの作成中にエラーが発生しました。" });
  }
});


export default router;