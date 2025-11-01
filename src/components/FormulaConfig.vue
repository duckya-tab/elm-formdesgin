<template>
    <div class="_fd-formula">
        <el-badge :value="badgeValue" type="warning" :hidden="badgeValue < 1">
            <el-button size="small" @click="openDialog">{{ t('designer.formula') || '公式' }}</el-button>
        </el-badge>
        <el-dialog class="_fd-fn-list-dialog _fd-formula-dialog" title="公式配置" v-model="visible" destroy-on-close
            :close-on-click-modal="false" append-to-body width="1080px">
            <el-container class="_fd-fn-list-con _fd-formula-con" style="height: 600px">
                <el-aside style="width:300px;">
                    <el-container class="_fd-fn-list-l _fd-formula-l">
                        <el-header class="_fd-fn-list-head _fd-formula-head" height="40px">
                            <span class="_fd-formula-title">数据 / 函数</span>
                        </el-header>
                        <div class="_fd-formula-l-main">
                            <div class="_fd-formula-section _fd-formula-search">
                                <header class="_fd-formula-section__title">检索</header>
                                <el-input v-model="filterKeyword" size="small" clearable class="_fd-formula-filter"
                                    placeholder="搜索变量 / 函数" />
                            </div>
                            <div class="_fd-formula-section _fd-formula-variables">
                                <header class="_fd-formula-section__title">表单变量</header>
                                <el-tree ref="fieldTreeRef" class="_fd-formula-tree" :data="fieldTreeData"
                                    node-key="key" :props="treeProps" :expand-on-click-node="false" highlight-current
                                    default-expand-all :filter-node-method="filterFieldNode"
                                    @node-click="handleFieldNodeClick" empty-text="暂无已填写的变量">
                                    <template #default="{ data }">
                                        <div class="_fd-formula-tree-node">
                                            <div class="_fd-formula-field__label">{{ data.label }}</div>
                                            <div class="_fd-formula-field__meta" v-if="data.children && data.children.length">
                                                {{ data.field }}
                                            </div>
                                            <div class="_fd-formula-field__meta" v-else>{{ data.field }}</div>
                                            <div class="_fd-formula-field__value" v-if="data.rawField && (!data.children || !data.children.length)">
                                                {{ data.rawField }}
                                            </div>
                                        </div>
                                    </template>
                                </el-tree>
                            </div>
                            <div class="_fd-formula-section _fd-formula-functions">
                                <header class="_fd-formula-section__title">公式函数</header>
                                <div class="_fd-formula-functions__picker">
                                    <el-autocomplete
                                        v-model="functionKeyword"
                                        :fetch-suggestions="queryFunctions"
                                        size="small"
                                        clearable
                                        class="_fd-formula-filter"
                                        placeholder="输入关键字快速选择函数"
                                        @select="handleFunctionSelect"
                                    />
                                </div>
                                <el-tree ref="functionTreeRef" class="_fd-formula-tree" :data="functionTreeData"
                                    node-key="key" :props="functionTreeProps" :expand-on-click-node="false"
                                    highlight-current default-expand-all :filter-node-method="filterFunctionNode"
                                    @node-click="handleFunctionNodeClick" empty-text="暂无可用函数">
                                    <template #default="{ data }">
                                        <div class="_fd-formula-tree-node">
                                            <div class="_fd-formula-field__label">{{ data.label }}</div>
                                        </div>
                                    </template>
                                </el-tree>
                            </div>
                        </div>
                    </el-container>
                </el-aside>
                <el-main>
                    <el-container class="_fd-fn-list-r _fd-formula-r">
                        <el-header class="_fd-fn-list-head _fd-formula-head" height="40px">
                           
                        </el-header>
                        <el-main>
                            <div class="_fd-formula-editor">
                                <div class="_fd-formula-editor__header">
                                    <span>表达式</span>
                                    <el-button size="small" plain @click="clearFormula">清空</el-button>
                                </div>
                                <div ref="editorContainer" class="_fd-formula-editor__cm"></div>
                            </div>
                        </el-main>
                    </el-container>
                </el-main>
            </el-container>
            <template #footer>
                <div>
                    <el-button size="default" @click="closeDialog">{{ t('props.cancel') }}</el-button>
                    <el-button type="primary" size="default" color="#2f73ff" @click="submit">{{ t('props.ok')
                        }}</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script>
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.css';
import CodeMirror from 'codemirror/lib/codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/javascript-hint';
import { defineComponent, ref, computed, watch, nextTick, inject } from 'vue';

import functionGroups from '../config/formula/functions';

const hasContent = (val) => {
    if (val === 0 || val === false) return true;
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return String(val).trim().length > 0;
};

const formatValue = (val) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

export default defineComponent({
    name: 'FormulaConfig',
    emits: ['update:modelValue'],
    props: {
        modelValue: {
            type: [String, Number, null],
            default: '',
        },
    },
    setup(props, { emit }) {
        const designer = inject('designer');

        const visible = ref(false);
        const filterKeyword = ref('');
        const formula = ref('');
        const editorInstance = ref(null);
        const editorContainer = ref(null);
        const fieldTreeRef = ref(null);
        const functionTreeRef = ref(null);
        const functionKeyword = ref('');
        const rawFieldRules = ref([]);

        const treeProps = { label: 'label', children: 'children' };
        const functionTreeProps = { label: 'label', children: 'children' };

        const t = (...args) => designer?.setupState?.t?.(...args) ?? '';

        const hasFormula = computed(() => hasContent(props.modelValue));
        const badgeValue = computed(() => (hasFormula.value ? 1 : 0));

        const normalizeFormula = (val) => {

            if (val === null || val === undefined) return '';
            return String(val);
        };

        const resolveRuleValue = (rule) => {
            if (!rule || typeof rule !== 'object') return undefined;
            if (Object.prototype.hasOwnProperty.call(rule, 'value')) {
                return rule.value;
            }
            if (rule.props && Object.prototype.hasOwnProperty.call(rule.props, 'value')) {
                return rule.props.value;
            }
            if (rule.formValue !== undefined) {
                return rule.formValue;
            }
            return undefined;
        };

        const parseRequiredFields = (rules, parentIdPath = [], parentLabelPath = []) => {
            if (!Array.isArray(rules)) return [];
            const nodes = [];
            rules.forEach((rule) => {
                if (!rule || typeof rule !== 'object') return;

                const rawTitle = typeof rule.title === 'string' ? rule.title.trim() : '';
                const title = rawTitle || rule.field || rule._fc_id || '未命名字段';
                const idSegment = rule.field || rule._fc_id || title;
                const currentIdPath = [...parentIdPath, idSegment];
                const currentLabelPath = [...parentLabelPath, title];

                const childRules = Array.isArray(rule?.props?.rule) ? rule.props.rule
                    : Array.isArray(rule?.children) ? rule.children
                        : null;
                const childNodes = childRules ? parseRequiredFields(childRules, currentIdPath, currentLabelPath) : [];
                const hasChildren = childNodes.length > 0;
                const isRequired = rule.$required === true;

                if (hasChildren) {
                    nodes.push({
                        key: currentIdPath.join('.'),
                        field: currentLabelPath.join('.'),
                        rawField: currentIdPath.join('.'),
                        label: title,
                        displayLabel: title,
                        children: childNodes,
                    });
                }

                if (isRequired && !hasChildren) {
                    nodes.push({
                        key: currentIdPath.join('.'),
                        field: currentLabelPath.join('.'),
                        rawField: currentIdPath.join('.'),
                        label: title,
                        displayLabel: currentLabelPath.join('.'),
                    });
                }
            });
            return nodes;
        };

        const resolveDescription = () => {
            const ctx = designer?.ctx;
            if (ctx && typeof ctx.getDescription === 'function') {
                return ctx.getDescription() || [];
            }
            const setup = designer?.setupState;
            if (setup && typeof setup.getDescription === 'function') {
                return setup.getDescription() || [];
            }
            return [];
        };

        const fieldTreeData = computed(() => parseRequiredFields(rawFieldRules.value));

        const collectLeaves = (nodes = []) => {
            const leaves = [];
            nodes.forEach((node) => {
                if (Array.isArray(node.children) && node.children.length) {
                    leaves.push(...collectLeaves(node.children));
                } else {
                    leaves.push(node);
                }
            });
            return leaves;
        };

        const fieldLeafNodes = computed(() => collectLeaves(fieldTreeData.value));

        const includesKeyword = (keyword, text) => text && text.toLowerCase().includes(keyword);

        const fieldNodeMatches = (keyword, node) => {
            if (!node) return false;
            if (includesKeyword(keyword, node.label)) return true;
            if (includesKeyword(keyword, node.field)) return true;
            if (includesKeyword(keyword, node.rawField)) return true;
            if (includesKeyword(keyword, node.displayLabel)) return true;
            if (Array.isArray(node.children) && node.children.length) {
                return node.children.some(child => fieldNodeMatches(keyword, child));
            }
            return false;
        };

        const functionTreeData = computed(() => functionGroups);
        const flatFunctionList = computed(() => {
            const items = [];
            functionGroups.forEach(group => {
                (group.children || []).forEach(child => {
                    items.push({
                        ...child,
                        group: group.label,
                        value: child.label,
                    });
                });
            });
            return items;
        });

        const buildHintItems = () => {
            const variableHints = fieldLeafNodes.value.map(item => ({
                insertText: `{{${item.field}}}`,
                label: item.displayLabel || item.label || item.field,
                desc: item.rawField || item.field,
                type: 'variable',
            }));

            const functionHints = flatFunctionList.value.map(item => ({
                insertText: item.template || `${item.key}()` ,
                label: item.label,
                desc: item.description || item.group || '',
                key: item.key,
                group: item.group,
                type: 'function',
            }));

            return [...variableHints, ...functionHints];
        };

        const formulaHint = (cm) => {
            const cursor = cm.getCursor();
            const line = cm.getLine(cursor.line);
            let start = cursor.ch;
            while (start > 0 && /[\w${}]/.test(line.charAt(start - 1))) {
                start--;
            }
            const currentWord = line.slice(start, cursor.ch).toLowerCase();

            const suggestions = buildHintItems().filter(item => {
                if (!currentWord) return true;
                return (
                    item.label.toLowerCase().includes(currentWord) ||
                    item.insertText.toLowerCase().includes(currentWord) ||
                    (item.key && item.key.toLowerCase().includes(currentWord)) ||
                    (item.desc && item.desc.toLowerCase().includes(currentWord)) ||
                    (item.group && item.group.toLowerCase().includes(currentWord))
                );
            });

            if (!suggestions.length) {
                return null;
            }

            const fromPos = CodeMirror.Pos(cursor.line, start);

            return {
                list: suggestions.map(item => ({
                    text: item.insertText,
                    displayText: `${item.label}${item.group ? ' · ' + item.group : ''}${item.desc ? ' — ' + item.desc : ''}`,
                    hint(cmInstance) {
                        cmInstance.replaceRange(item.insertText, fromPos, cursor);
                        if (item.type === 'function' && item.insertText.includes('${')) {
                            const placeholderStart = item.insertText.indexOf('${');
                            const placeholderEnd = item.insertText.indexOf('}', placeholderStart);
                            if (placeholderEnd > placeholderStart) {
                                const selectionStart = CodeMirror.Pos(fromPos.line, fromPos.ch + placeholderStart);
                                const selectionEnd = CodeMirror.Pos(fromPos.line, fromPos.ch + placeholderEnd + 1);
                                cmInstance.setSelection(selectionStart, selectionEnd);
                            } else {
                                cmInstance.setCursor(CodeMirror.Pos(fromPos.line, fromPos.ch + item.insertText.length));
                            }
                        } else {
                            cmInstance.setCursor(CodeMirror.Pos(fromPos.line, fromPos.ch + item.insertText.length));
                        }
                        cmInstance.focus();
                    },
                })),
                from: fromPos,
                to: cursor,
            };
        };

        const createFormulaOverlay = () => ({
            token(stream) {
                if (stream.match(/{{[^}]+}}/)) {
                    return 'formula-placeholder';
                }
                if (stream.match(/[A-Z_][A-Z0-9_]*(?=\()/)) {
                    return 'formula-function';
                }
                if (stream.match(/\b\d+(?:\.\d+)?\b/)) {
                    return 'formula-number';
                }
                stream.next();
                return null;
            },
        });

        const initEditor = () => {
            if (editorInstance.value) {
                editorInstance.value.setValue(formula.value || '');
                editorInstance.value.refresh();
                return;
            }
            const container = editorContainer.value;
            if (!container) return;
            const cm = CodeMirror(container, {
                value: formula.value || '',
                mode: { name: 'javascript', globalVars: true },
                lineNumbers: true,
                lineWrapping: true,
                tabSize: 2,
                extraKeys: {
                    'Ctrl-Space': (cmEditor) => cmEditor.showHint({ hint: formulaHint, completeSingle: false }),
                    'Cmd-Space': (cmEditor) => cmEditor.showHint({ hint: formulaHint, completeSingle: false })
                }
            });
            cm.addOverlay(createFormulaOverlay());
            cm.on('change', () => {
                formula.value = cm.getValue();
            });
            cm.on('inputRead', (editor, changeObj) => {
                const text = changeObj.text && changeObj.text[0];
                if (!text || /[^\w${}]/.test(text)) {
                    return;
                }
                editor.showHint({ hint: formulaHint, completeSingle: false });
            });
            cm.setOption('hintOptions', {
                hint: formulaHint,
                completeSingle: false,
            });
            editorInstance.value = cm;
            nextTick(() => cm.refresh());
        };

        const disposeEditor = () => {
            if (editorInstance.value) {
                editorInstance.value.toTextArea && editorInstance.value.toTextArea();
                editorInstance.value = null;
            }
        };

        const openDialog = () => {
            visible.value = true;
        };

        const closeDialog = () => {
            visible.value = false;
            functionKeyword.value = '';
        };

        const clearFormula = () => {
            formula.value = '';
            if (editorInstance.value) {
                editorInstance.value.setValue('');
                editorInstance.value.focus();
            }
        };

        const insertText = (text) => {
            if (!text) return;
            if (editorInstance.value) {
                editorInstance.value.replaceSelection(text);
                editorInstance.value.focus();
            } else {
                formula.value = (formula.value || '') + text;
            }
        };

        const handleFieldNodeClick = (data, node) => {
            if (!data) return;
            const hasChildren = Array.isArray(data.children) && data.children.length;
            const nodeHasChildren = node && Array.isArray(node.childNodes) && node.childNodes.length;
            if (hasChildren || nodeHasChildren) return;
            insertText(`{{${data.field}}}`);
        };

        const handleFunctionNodeClick = (data) => {
            if (data && (!Array.isArray(data.children) || data.children.length === 0)) {
                insertText(data.template);
            }
        };

        const queryFunctions = (queryString, cb) => {
            const keyword = (queryString || '').trim().toLowerCase();
            const result = !keyword
                ? flatFunctionList.value
                : flatFunctionList.value.filter(item =>
                    item.label.toLowerCase().includes(keyword) ||
                    (item.key && item.key.toLowerCase().includes(keyword))
                );
            cb(result.slice(0, 12));
        };

        const handleFunctionSelect = (item) => {
            if (!item) return;
            insertText(item.template);
            functionKeyword.value = '';
        };

        const submit = () => {
            const value = normalizeFormula(formula.value).trim();
            emit('update:modelValue', value);
            closeDialog();
        };

        const filterFieldNode = (value, data) => {
            if (!value) return true;
            const keyword = value.toLowerCase();
            return fieldNodeMatches(keyword, data);
        };

        const filterFunctionNode = (value, data) => {
            if (!value) return true;
            const keyword = value.toLowerCase();
            return (
                (data.label && data.label.toLowerCase().includes(keyword)) ||
                (data.template && data.template.toLowerCase().includes(keyword))
            );
        };

        const filterTrees = () => {
            nextTick(() => {
                fieldTreeRef.value?.filter(filterKeyword.value);
                functionTreeRef.value?.filter(filterKeyword.value);
            });
        };

        watch(filterKeyword, () => {
            filterTrees();
        });

        watch(() => props.modelValue, (val) => {
            const normalized = normalizeFormula(val);
            if (!visible.value) {
                formula.value = normalized;
            } else if (editorInstance.value && editorInstance.value.getValue() !== normalized) {
                editorInstance.value.setValue(normalized);
            }
        }, { immediate: true });

        watch(visible, (val) => {
            if (val) {
                rawFieldRules.value = resolveDescription();
                formula.value = normalizeFormula(props.modelValue);
                nextTick(() => {
                    initEditor();
                    filterTrees();
                });
            } else {
                disposeEditor();
            }
        });

        watch(() => designer?.ctx, () => {
            if (visible.value) {
                rawFieldRules.value = resolveDescription();
            }
        });

        return {
            t,
            visible,
            badgeValue,
            filterKeyword,
            fieldTreeData,
            functionTreeData,
            treeProps,
            functionTreeProps,
            fieldTreeRef,
            functionTreeRef,
            functionKeyword,
            editorContainer,
            openDialog,
            closeDialog,
            clearFormula,
            submit,
            handleFieldNodeClick,
            handleFunctionNodeClick,
            filterFieldNode,
            filterFunctionNode,
            queryFunctions,
            handleFunctionSelect,
        };
    }
});
</script>

<style>
._fd-formula,
._fd-formula .el-badge {
    width: 100%;
}

._fd-formula .el-button {
    font-weight: 400;
    width: 100%;
    border-color: #2E73FF;
    color: #2E73FF;
}

._fd-formula-dialog .el-dialog__body {
    padding: 10px 20px;
}

._fd-formula-con .el-main {
    padding: 0;
}

._fd-formula-l,
._fd-formula-r {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    border: 1px solid #ececec;
}

._fd-formula-r {
    border-left: 0 none;
}

._fd-formula-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
    background: #f8f9ff;
}

._fd-formula-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

._fd-formula-doc {
    color: #2f73ff;
    text-decoration: none;
    font-size: 13px;
}

._fd-formula-l-main {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
    height: 100%;
}

._fd-fn-list-l>._fd-formula-l-main {
    display: flex;
}

._fd-formula-filter .el-input__wrapper {
    border-radius: 6px;
}

._fd-formula-section {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

._fd-formula-search {
    flex: 0 0 auto;
}

._fd-formula-variables,
._fd-formula-functions {
    flex: 1 1 0;
    overflow: hidden;
}

._fd-formula-functions__picker {
    flex: 0 0 auto;
}

._fd-formula-section__title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
}

._fd-formula-tree {
    flex: 1;
    overflow: auto;
}

._fd-formula-tree-node {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 4px;
}

._fd-formula-field__label {
    font-size: 13px;
    font-weight: 500;
    color: #303133;
}

._fd-formula-field__meta {
    font-size: 12px;
    color: #909399;
    word-break: break-all;
}

._fd-formula-field__value {
    font-size: 12px;
    color: #606266;
    padding: 6px 8px;
    background: #f4f5fb;
    border-radius: 4px;
    word-break: break-all;
}

._fd-formula-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
    gap: 12px;
}

._fd-formula-editor__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    color: #303133;
}

._fd-formula-editor__cm {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    overflow: hidden;
}

._fd-formula-editor__cm .CodeMirror {
    height: 100%;
    font-size: 13px;
    line-height: 1.6;
}

._fd-formula-editor__cm .CodeMirror-lines {
    padding: 12px;
}

._fd-formula-editor__cm .CodeMirror-selected {
    background: rgba(47, 115, 255, 0.2) !important;
}

._fd-formula-editor__cm .CodeMirror-cursor {
    border-left: 1px solid #2E73FF;
}

._fd-formula-editor__cm .CodeMirror .cm-formula-function {
    color: #2f73ff;
    font-weight: 600;
}

._fd-formula-editor__cm .CodeMirror .cm-formula-placeholder {
    color: #9d238c;
}

._fd-formula-editor__cm .CodeMirror .cm-formula-number {
    color: #e67e22;
}
</style>
