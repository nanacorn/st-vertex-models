// Vertex Models+ (모델 추가)
// 실리태번 목록에 아직 없는 제미나이 모델 이름을 직접 넣어 쓰게 해 준다.
// Google Vertex AI 목록과 Google AI Studio 목록에 같은 모델 묶음을 넣는다.

import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';

const ID = 'vertex_models_plus';
// 목록마다 "마지막으로 고른 모델"을 따로 기억한다. Vertex는 예전 이름(chosen)을 그대로 쓴다.
const SELECTS = [
    { id: 'model_vertexai_select', key: 'chosen' },
    { id: 'model_google_select', key: 'chosenGoogle' },
];

// 처음 설치했을 때 미리 들어가 있는 모델
const STARTER = ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-4-carbon', 'gemini-4-hydrogen', 'gemini-4-neon'];
// 1.0.0에 들어 있던 모델 (이미 설치한 사람에게 새 모델만 한 번 더해 주는 데 쓴다)
const STARTER_V100 = ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-4-carbon'];

// 화면에 붙은 목록들. 한쪽에서 모델 이름을 바꾸면 다른 쪽도 다시 채운다.
const mounted = [];

function cfg() {
    if (!extension_settings[ID]) extension_settings[ID] = {};
    const s = extension_settings[ID];
    if (!Array.isArray(s.names)) {
        s.names = [...STARTER];
        s.seeded = [...STARTER];
    }
    // 업데이트로 새로 생긴 기본 모델은 한 번만 넣는다. 지운 모델은 다시 넣지 않는다.
    if (!Array.isArray(s.seeded)) s.seeded = [...STARTER_V100];
    const fresh = STARTER.filter(n => !s.seeded.includes(n));
    if (fresh.length) {
        s.names = tidy([...s.names, ...fresh]);
        s.seeded.push(...fresh);
        saveSettingsDebounced();
    }
    for (const { key } of SELECTS) {
        if (typeof s[key] !== 'string') s[key] = '';
    }
    return s;
}

function tidy(list) {
    return [...new Set(list.map(x => String(x).trim()).filter(Boolean))];
}

function setup(select, key) {
    const s = cfg();

    // 목록 맨 위에 "직접 넣은 모델" 묶음을 만든다.
    const group = document.createElement('optgroup');
    group.label = '직접 넣은 모델';
    select.prepend(group);

    // 모델 목록 아래에 접히는 입력 칸을 붙인다.
    const box = $(`
        <div class="vmp-box">
            <div class="vmp-toggle menu_button" title="목록에 없는 모델 직접 넣기">
                <i class="fa-solid fa-circle-plus"></i> <span>모델 직접 넣기</span>
            </div>
            <div class="vmp-panel">
                <small>모델 이름을 한 줄에 하나씩 적고 <b>목록에 넣기</b>를 누르세요.</small>
                <textarea class="text_pole vmp-text" rows="4" placeholder="gemini-4-argon"></textarea>
                <div class="vmp-actions">
                    <div class="menu_button vmp-apply"><i class="fa-solid fa-check"></i> 목록에 넣기</div>
                    <span class="vmp-note"></span>
                </div>
            </div>
        </div>`);
    $(select).after(box);

    // 이름 목록이 바뀌었을 때 이 목록을 다시 채운다. 고르던 모델은 남아 있으면 유지한다.
    const fill = () => {
        const c = cfg();
        const before = select.value;
        group.replaceChildren(...c.names.map(n => new Option(n, n)));
        group.hidden = c.names.length === 0;
        box.find('.vmp-text').val(c.names.join('\n'));
        if (before && select.value !== before && [...select.options].some(o => o.value === before)) {
            select.value = before;
        }
    };
    mounted.push(fill);

    box.find('.vmp-toggle').on('click', () => box.toggleClass('vmp-open'));
    box.find('.vmp-apply').on('click', () => {
        const before = select.value;
        const c = cfg();
        c.names = tidy(String(box.find('.vmp-text').val()).split('\n'));
        mounted.forEach(f => f());
        if (c.names.includes(before)) select.value = before;
        c[key] = c.names.includes(select.value) ? select.value : '';
        saveSettingsDebounced();
        $(select).trigger('change');
        box.find('.vmp-note').text(`${c.names.length}개 넣었어요`);
    });

    // 직접 넣은 모델을 고르면 기억해 두었다가, 다음에 켤 때 다시 고른다.
    $(select).on('change', () => {
        const c = cfg();
        const pick = c.names.includes(select.value) ? select.value : '';
        if (pick !== c[key]) {
            c[key] = pick;
            saveSettingsDebounced();
        }
    });

    fill();
    if (s[key] && s.names.includes(s[key]) && select.value !== s[key]) {
        select.value = s[key];
        $(select).trigger('change');
    }
}

function start() {
    let all = true;
    for (const { id, key } of SELECTS) {
        const select = document.getElementById(id);
        if (!(select instanceof HTMLSelectElement)) {
            all = false;
            continue;
        }
        if (!select.dataset.vmp) {
            select.dataset.vmp = '1';
            setup(select, key);
        }
    }
    return all;
}

jQuery(() => {
    const fresh = !extension_settings[ID];
    cfg();
    if (fresh) saveSettingsDebounced();
    if (!start()) eventSource.once(event_types.APP_READY, start);
});
