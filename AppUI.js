/* =========================================================================
 * AppUI.js —— 逆波兰逻辑仿真页面（含量词）的新版 UI 辅助层
 * 负责：状态栏提示、操作符面板插入、量词信息展示、示例、快捷键。
 * 依赖：LogicParser.js（提供 LogicParser.lastInfo），ViewGen.js（提供 app 主流程）
 * ======================================================================= */
var app = window.app = window.app || {};

(function () {
    'use strict';

    var QUANT_LABEL = { E: '∃', A: '∀' };

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ---------------- 状态栏 ---------------- */
    /* kind: 'info' | 'ok' | 'warn' | 'error' */
    app.setStatus = function (text, kind) {
        var status = document.getElementById('status');
        if (!status) { return; }
        status.textContent = text;
        status.className = kind ? kind : '';
    };

    /* 同 setStatus，但会闪一下，用于替代 alert() */
    app.notify = function (text, kind) {
        app.setStatus(text, kind || 'warn');
        var status = document.getElementById('status');
        if (!status) { return; }
        status.classList.remove('flash');
        void status.offsetWidth;
        status.classList.add('flash');
    };

    /* ---------------- 表达式输入辅助 ---------------- */
    function exprBox() {
        return document.getElementById('ReversePol');
    }

    app.insertToken = function (token, hint) {
        var box = exprBox();
        if (!box) { return; }
        var start = (box.selectionStart == null) ? box.value.length : box.selectionStart;
        var end = (box.selectionEnd == null) ? start : box.selectionEnd;
        var value = box.value;
        var left = value.slice(0, start);
        var right = value.slice(end);

        var ins = token;
        if (left.length && !/\s$/.test(left)) { ins = ' ' + ins; }
        if (right.length && !/^\s/.test(right)) { ins = ins + ' '; }

        box.value = left + ins + right;
        var caret = (left + ins).length;
        box.focus();
        try { box.setSelectionRange(caret, caret); } catch (e) { /* ignore */ }

        if (hint) { app.setStatus(hint, 'info'); }
    };

    app.clearExpr = function () {
        var box = exprBox();
        if (box) { box.value = ''; box.focus(); }
        app.showParseInfo(null);
        app.setStatus('已清空表达式。', 'info');
    };

    app.loadExample = function () {
        var box = exprBox();
        if (!box) { return; }
        box.value = 'a b . x ∃ fe >';
        box.focus();
        app.setStatus('已填入示例：a b . x ∃ fe >（先对 x 做存在量化，再与 fe 做推出）', 'info');
    };

    /* ---------------- 量词 / 自由变量信息 ---------------- */
    function chips(list, cls) {
        if (!list || !list.length) {
            return '<span class="k">无</span>';
        }
        return list.map(function (item) {
            return '<span class="chip ' + (cls || '') + '">' + esc(item) + '</span>';
        }).join('');
    }

    app.showParseInfo = function (parsed) {
        var box = document.getElementById('parseInfo');
        if (!box) { return; }

        if (parsed == null || typeof parsed === 'string') {
            box.innerHTML = '<span class="k">尚未解析表达式。</span>' +
                '<br><span class="k">量词写法：</span><code>f x E</code>（∃x）或 <code>f x A</code>（∀x）。';
            return;
        }

        var info = window.LogicParser && LogicParser.lastInfo ? LogicParser.lastInfo : null;
        var quantNames = [];
        var bound = [];
        if (info && info.quantifiers) {
            info.quantifiers.forEach(function (q) {
                quantNames.push((QUANT_LABEL[q.kind] || q.kind) + q.var);
                if (bound.indexOf(q.var) < 0) { bound.push(q.var); }
            });
        }

        var freeVars = [];
        if (window.origin && origin.nodeArray) {
            origin.nodeArray.forEach(function (n) {
                if (n && 'Import' === n.type && n.name && freeVars.indexOf(n.name) < 0) {
                    freeVars.push(n.name);
                }
            });
        }

        box.innerHTML =
            '<div><span class="k">量词：</span>' + chips(quantNames, 'q') + '</div>' +
            '<div><span class="k">约束变量：</span>' + chips(bound) + '</div>' +
            '<div><span class="k">自由变量：</span>' + chips(freeVars) + '</div>';
    };

    /* ---------------- 事件绑定 ---------------- */
    function bind() {
        var palette = document.querySelector('.palette');
        if (palette) {
            palette.addEventListener('click', function (evt) {
                var btn = evt.target.closest ? evt.target.closest('.op') : null;
                if (!btn) { return; }
                evt.preventDefault();
                var token = btn.getAttribute('data-token');
                var quant = btn.getAttribute('data-quant');
                var hint;
                if (quant) {
                    hint = '已插入量词符 ' + (QUANT_LABEL[quant] || quant) +
                        '；量词语法是「表达式 f + 变量名 x + 量词符」，例如：a b , x ' + quant;
                } else {
                    hint = '已插入操作符 ' + token;
                }
                app.insertToken(token, hint);
            });
        }

        document.addEventListener('keydown', function (evt) {
            if ((evt.ctrlKey || evt.metaKey) && (evt.key === 'Enter' || evt.which === 13)) {
                evt.preventDefault();
                app.parseLogic();
            }
        });

    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    app.showParseInfo(null);
})();
