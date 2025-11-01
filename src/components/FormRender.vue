<template>
    <div>
        <h1>转发咯</h1>
        <ViewForm v-bind="formProps" v-model:api="formProps.api" @change="handleChange" @submit="handleSubmit"
            @reset="handleReset" v-if="formProps.state">
            <template v-for="(_, name) in $slots" #[name]="scope">
                <slot :name="name" v-bind="scope ?? {}" />
            </template>
        </ViewForm>
    </div>

</template>

<script setup>
import viewForm from '../utils/form';
const ViewForm = viewForm.$form();

const props = defineProps({
    formProps: {
        type: Object,
        required: true,
    },
});
console.log('初始化参数', props.formProps)
const emit = defineEmits(['submit', 'reset', 'change']);

function handleSubmit(...args) {
    const [formData, ctx] = args;
    console.log("handleSubmit", formData, ctx)
    emit('submit', ...args);
}

function handleChange(field, value, rule, api, flag) {
    console.log("chgange", field, value, rule, api, flag)
    // const [formData, ctx] = args;
    // console.log("handleChange", formData, ctx,args)
    emit('change', field, value, rule, api, flag);
}
function handleReset(...args) {

    emit('reset', ...args);
}
</script>
