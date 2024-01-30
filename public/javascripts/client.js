"use strict";

import axios from "axios";

(() => {
    let userId = null;
    let documents = [];

    // 関数群
    /**
     * ログインのチェックとユーザ名の取得
     */
    const getUser = async () => {
        try {
            const res = await axios.get("/api/check");
            const data = res.data;
            userId = data.result;
        } catch (e) {
            // ユーザ情報が取れなかったので未ログインのはず
            window.location.href = "/users/login";
            return;
        }
        await getAllData();
        // refresh();
    };

    /**
     * 全 Markdown ドキュメントを取ってくる
     */
    const getAllData = async () => {
        const res = await axios.get("/api/all");
        documents = res.data.documents;
        refreshDocumentList();
    };

    /**
     * ドキュメント一覧を更新するらしい
     */
    const refreshDocumentList = () => {
        let content = "";
        documents.map(markdown => {
            content += `<tr>
                <td><a class="text-dark" href="#" onclick="getById">${markdown.title}</a></td>
                </tr>`;
        });
        document.querySelector("#data_container").innerHTML = content;
    };

    // 初回ページ読み込み時の処理
    window.addEventListener("DOMContentLoaded", getUser);
})();