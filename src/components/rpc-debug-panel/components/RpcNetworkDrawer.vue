<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Copy, X } from "lucide-vue-next";
import type { RpcDebugRecord } from "../rpcDebugStore";
import { formatDebugPayload } from "../rpcDebugStore";
import { statusClass, statusText } from "../helpers";
import { cn } from "@/lib/utils";

type DetailTabKey = "headers" | "body" | "response";

const detailTabs: Array<{ key: DetailTabKey; label: string }> = [
  { key: "headers", label: "标头" },
  { key: "body", label: "body" },
  { key: "response", label: "响应" },
];

const props = defineProps<{
  record: RpcDebugRecord;
  class?: string;
}>();

const emit = defineEmits<{
  close: [];
  copy: [text: string, message?: string];
  edit: [record: RpcDebugRecord];
}>();

const activeDetailTab = ref<DetailTabKey>("headers");

const requestText = computed(() =>
  formatDebugPayload(props.record.request, props.record.method),
);

const responseText = computed(() =>
  formatDebugPayload(props.record.response, props.record.method),
);

const headerRows = computed(() => [
  { label: "方法", value: props.record.method },
  { label: "状态", value: statusText(props.record) },
  { label: "类型", value: props.record.kind },
  { label: "方向", value: props.record.direction },
  { label: "请求 ID", value: props.record.id ?? "-" },
  { label: "订阅 ID", value: props.record.subscription ?? "-" },
  { label: "连接 ID", value: `#${props.record.connectionId}` },
  { label: "URL", value: props.record.url },
  { label: "开始时间", value: formatTimestamp(props.record.startedAt) },
  { label: "结束时间", value: formatTimestamp(props.record.endedAt) },
  {
    label: "耗时",
    value:
      props.record.durationMs != null ? `${props.record.durationMs}ms` : "-",
  },
  { label: "备注", value: props.record.note ?? "-" },
]);

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function headerText() {
  return headerRows.value
    .map((row) => `${row.label}: ${String(row.value)}`)
    .join("\n");
}

function activeTabCopyText() {
  if (activeDetailTab.value === "body") return requestText.value;
  if (activeDetailTab.value === "response") return responseText.value;
  return headerText();
}

function activeTabCopyMessage() {
  if (activeDetailTab.value === "body") return "Body 已复制";
  if (activeDetailTab.value === "response") return "响应已复制";
  return "标头已复制";
}

function copyActiveTab() {
  emit("copy", activeTabCopyText(), activeTabCopyMessage());
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  emit("close");
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <aside
    :class="
      cn(
        'absolute bottom-0 right-0 top-0 flex w-[420px] max-w-full flex-col border-l bg-background shadow-xl',
        props.class,
      )
    "
  >
    <div class="border-b px-5 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold">消息详情</h2>
          <p class="mt-1 max-w-[250px] truncate text-xs text-muted-foreground">
            {{ record.method }}
          </p>
        </div>
        <button
          class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="emit('close')"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>

    <div class="space-y-4 border-b px-5 py-4">
      <div class="flex flex-wrap gap-2">
        <span
          class="inline-flex h-7 items-center rounded-md px-3 text-xs ring-1"
          :class="statusClass(record.status)"
        >
          {{ statusText(record) }}
        </span>
        <span
          class="inline-flex h-7 items-center rounded-md bg-muted px-3 text-xs ring-1 ring-border"
        >
          {{ record.durationMs != null ? `${record.durationMs}ms` : "-" }}
        </span>
        <span
          class="inline-flex h-7 items-center rounded-md bg-muted px-3 text-xs ring-1 ring-border"
        >
          {{ record.direction }}
        </span>
      </div>

      <div class="flex gap-2">
        <button
          class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="emit('edit', record)"
        >
          编辑并重新构造
        </button>
        <button
          class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="
            emit(
              'copy',
              formatDebugPayload(record, record.method),
              '完整记录已复制',
            )
          "
        >
          <Copy class="size-4" />完整复制
        </button>
      </div>
    </div>

    <div class="flex h-11 shrink-0 items-center justify-between border-b px-5">
      <div class="flex h-full items-center gap-4">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          class="h-full border-b-2 px-1 text-sm font-medium transition-colors"
          :class="
            activeDetailTab === tab.key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          type="button"
          @click="activeDetailTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <button
        class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        type="button"
        @click="copyActiveTab"
      >
        复制
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-5">
      <dl
        v-if="activeDetailTab === 'headers'"
        class="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"
      >
        <template v-for="row in headerRows" :key="row.label">
          <dt class="text-muted-foreground">{{ row.label }}</dt>
          <dd class="min-w-0 break-all font-mono text-xs leading-6">
            {{ row.value }}
          </dd>
        </template>
      </dl>

      <div v-else-if="activeDetailTab === 'body'" class="h-full min-h-0">
        <pre
          class="min-h-full overflow-auto rounded-md bg-muted/35 p-3 text-xs leading-relaxed"
          >{{ requestText || "无发送内容" }}</pre
        >
      </div>

      <div v-else class="h-full min-h-0">
        <pre
          class="min-h-full overflow-auto rounded-md bg-muted/35 p-3 text-xs leading-relaxed"
          >{{ responseText || "等待响应" }}</pre
        >
      </div>
    </div>
  </aside>
</template>
