<template>
  <div class="admin-pagination-container">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="pageSizes || [10, 20, 50, 100]"
      :total="total"
      :layout="layout"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      :background="background"
      :small="small"
      :hide-on-single-page="hideOnSinglePage"
    ></el-pagination>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 当前页码
  modelValue: {
    type: Number,
    default: 1
  },
  // 每页大小
  pageSize: {
    type: Number,
    default: 10
  },
  // 可选的每页大小
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  // 总记录数
  total: {
    type: Number,
    default: 0
  },
  // 分页布局
  layout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper'
  },
  // 是否显示背景色
  background: {
    type: Boolean,
    default: false
  },
  // 是否使用小型分页
  small: {
    type: Boolean,
    default: false
  },
  // 只有一页时是否隐藏分页
  hideOnSinglePage: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'update:pageSize', 'change', 'size-change', 'current-change']);

// 计算属性：当前页码
const currentPage = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// 计算属性：每页大小
const pageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val)
});

// 处理页码变化
const handleCurrentChange = (val) => {
  emit('current-change', val);
  emit('change', { page: val, size: props.pageSize });
};

// 处理每页大小变化
const handleSizeChange = (val) => {
  emit('size-change', val);
  emit('change', { page: props.modelValue, size: val });
};
</script>

<style scoped lang="scss">
.admin-pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 