//routers/messages

import express from "express";
import {check, validationResult} from "express-validator";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/** 1ペジあたりのメッセージ数 */
const maxItemCount = 10;

/**
 * 全経路でログイン済みかチェックする
 */
router.use((req, res, next) => {
    if (!req.user) {
        // 未ログイン
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    // 問題なければ次へ
    next();
});

/**
 * メッセージの投稿
 */
router.post("/create", [
    check("text").notEmpty({ignore_whitespace: true})
], async (req, res, next) => {
    if (!validationResult(req).isEmpty()) {
        // データが足りないのでエラー
        res.status(400).json({message: "error"});
        return;
    }
    const text = req.body.text;
    const userId = +req.user.id;
    await prisma.message.create({
        data: {
            userId,
            text
        }
    });
    res.status(201).json({message: "created"});
});

/**
 * 全メッセージの一覧
 */
router.get("/read", async (req, res, next) => {
    const page = req.query.page ? +req.query.page : 1;
    const skip = maxItemCount * (page - 1);

    /*
        2つのクエリを実行したいが、個別に await すると効率が悪い。
        (※非同期処理 Promise の意味がなくなる。)
        なので、Promise.all でラップして、2つのクエリ自体は非同期で
        並列に処理してもらうが、2つとも終わるまでは await で待機するための
        Promise.all([ ]) よびだし。
     */
    const [messages, count] = await Promise.all([
        // 1ページ分のメッセージデータを取るクエリ
        prisma.message.findMany({
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: maxItemCount,
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            }
        }),
        // 全体のメッセージ数を取るクエリ
        prisma.message.count()
    ]);
    // 最大ページ数計算
    const maxPageCount = Math.ceil(count / maxItemCount);
    res.json({
        message: "ok",
        messages,
        maxPageCount
    });
});

/**
 * 特定のユーザのメッセージ一覧
 */
router.get("/:uid/read", async (req, res, next) => {
    const page = req.query.page ? +req.query.page : 1;
    const skip = maxItemCount * (page - 1);
    const uid = +req.params.uid;

    /*
        メッセージ一覧と同じく、Promise.all を使って
        3つのクエリを出来る限り効率よく実行する。
        ユーザ情報は1つだけになるはずなので 、Message に include するのは無駄です。
     */
    const [messages, user, count] = await Promise.all([
        prisma.message.findMany({
            where: {
                userId: uid
            },
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: maxItemCount
        }),
        prisma.user.findUnique({
            where: {
                id: uid
            }
        }),
        prisma.message.count({
            where: {
                userId: uid
            }
        })
    ]);
    const maxPageCount = Math.ceil(count / maxItemCount);
    res.json({
        message: "ok",
        messages,
        user,
        maxPageCount
    });
});

router.get('/read', async (req, res) => {
    try {
        const messages = await prisma.message.findMany();
        res.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;