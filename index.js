// Vertex Models+ (모델 추가)
// 실리태번 목록에 아직 없는 Google Vertex AI 모델 이름을 직접 넣어 쓰게 해 준다.

import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';

const ID = 'vertex_models_plus';
const SELECT = 'model_vertexai_select';

// 처음 설치했을 때 미리 들어가 있는 모델
const STARTER = ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-4-carbon', 'gemini-4-hydrogen'];
// 1.0.0에 들어 있던 모델 (이미 설치한 사람에게 새 모델만 한 번 더해 주는 데 쓴다)
const STARTER_V100 = ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-4-carbon'];

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
    if (typeof s.chosen !== 'string') s.chosen = '';
    return s;
}

function tidy(list) {
    return [...new Set(list.map(x => String(x).trim()).filter(Boolean))];
}

function setup(select) {
    const s = cfg();

    // 목록 맨 위에 "직접 넣은 모델" 묶음을 만든다.
    const group = document.createElement('optgroup');
    group.label = '직접 넣은 모델';
    select.prepend(group);

    const fill = () => {
        group.replaceChildren(...cfg().names.map(n => new Option(n, n)));
        group.hidden = cfg().names.length === 0;
    };

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

    box.find('.vmp-text').val(s.names.join('\n'));
    box.find('.vmp-toggle').on('click', () => box.toggleClass('vmp-open'));
    box.find('.vmp-apply').on('click', () => {
        const before = select.value;
        const c = cfg();
        c.names = tidy(String(box.find('.vmp-text').val()).split('\n'));
        box.find('.vmp-text').val(c.names.join('\n'));
        fill();
        if (c.names.includes(before)) select.value = before;
        c.chosen = c.names.includes(select.value) ? select.value : '';
        saveSettingsDebounced();
        $(select).trigger('change');
        box.find('.vmp-note').text(`${c.names.length}개 넣었어요`);
    });

    // 직접 넣은 모델을 고르면 기억해 두었다가, 다음에 켤 때 다시 고른다.
    $(select).on('change', () => {
        const c = cfg();
        const pick = c.names.includes(select.value) ? select.value : '';
        if (pick !== c.chosen) {
            c.chosen = pick;
            saveSettingsDebounced();
        }
    });

    fill();
    if (s.chosen && s.names.includes(s.chosen) && select.value !== s.chosen) {
        select.value = s.chosen;
        $(select).trigger('change');
    }
}

function start() {
    const select = document.getElementById(SELECT);
    if (select instanceof HTMLSelectElement && !select.dataset.vmp) {
        select.dataset.vmp = '1';
        setup(select);
        return true;
    }
    return false;
}

jQuery(() => {
    const fresh = !extension_settings[ID];
    cfg();
    if (fresh) saveSettingsDebounced();
    if (!start()) eventSource.once(event_types.APP_READY, start);
});
