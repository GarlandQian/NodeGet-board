<script setup lang="ts">
import { computed, h, ref } from "vue";
import type { ColumnDef } from "@tanstack/vue-table";
import { Download, Pause, Play, Search, Trash2 } from "lucide-vue-next";
import type { RpcDebugRecord } from "../rpcDebugStore";
import { useRpcDebugStore } from "../rpcDebugStore";
import {
  downloadText,
  kindText,
  statusClass,
  statusText,
  timeText,
} from "../helpers";
import RpcDebugDataTable from "./RpcDebugDataTable.vue";
import RpcNetworkDrawer from "./RpcNetworkDrawer.vue";

const emit = defineEmits<{
  copy: [text: string, message?: string];
  editRecord: [record: RpcDebugRecord];
}>();

const debugStore = useRpcDebugStore();
const networkFilter = ref("");
const statusFilter = ref("all");
const kindFilter = ref("all");

const selectedRecord = computed(() => debugStore.selectedRecord.value);

const filteredRecords = computed(() => {
  const q = networkFilter.value.trim().toLowerCase();
  return debugStore.records.value.filter((record) => {
    const matchesText =
      !q ||
      record.method.toLowerCase().includes(q) ||
      String(record.id ?? "")
        .toLowerCase()
        .includes(q) ||
      String(record.subscription ?? "")
        .toLowerCase()
        .includes(q);
    const matchesStatus =
      statusFilter.value === "all" || record.status === statusFilter.value;
    const matchesKind =
      kindFilter.value === "all" || record.kind === kindFilter.value;
    return matchesText && matchesStatus && matchesKind;
  });
});

const networkColumns = computed<ColumnDef<RpcDebugRecord>[]>(() => [
  {
    id: "time",
    header: "时间",
    size: 90,
    cell: ({ row }) => timeText(row.original.startedAt),
    meta: { cellClass: "text-muted-foreground" },
  },
  {
    id: "method",
    header: "方法",
    size: 320,
    cell: ({ row }) => row.original.method,
    meta: { cellClass: "max-w-[360px] truncate font-mono text-xs" },
  },
  {
    id: "id",
    header: "ID / 订阅",
    size: 132,
    cell: ({ row }) =>
      String(row.original.id ?? row.original.subscription ?? "-"),
    meta: { cellClass: "max-w-[132px] truncate text-muted-foreground" },
  },
  {
    id: "kind",
    header: "类型",
    size: 96,
    cell: ({ row }) => kindText(row.original),
  },
  {
    id: "status",
    header: "状态",
    size: 96,
    cell: ({ row }) =>
      h(
        "span",
        {
          class: [
            "inline-flex h-6 items-center rounded px-2 text-xs ring-1",
            statusClass(row.original.status),
          ],
        },
        statusText(row.original),
      ),
  },
  {
    id: "duration",
    header: "耗时",
    size: 84,
    cell: ({ row }) =>
      row.original.durationMs != null ? `${row.original.durationMs}ms` : "-",
    meta: { cellClass: "text-muted-foreground" },
  },
]);

function selectRecord(record: RpcDebugRecord) {
  debugStore.selectedRecordId.value = record.recordId;
}

function closeDrawer() {
  debugStore.selectedRecordId.value = null;
}

function exportRecords() {
  downloadText(
    `nodeget-rpc-debug-${Date.now()}.json`,
    debugStore.exportRecords(),
  );
}

function relayCopy(text: string, message?: string) {
  emit("copy", text, message);
}
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden p-4">
    <!-- 控制区 -->
    <div
      class="mb-3 flex flex-none flex-wrap items-center justify-between gap-2"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label class="relative min-w-55 flex-1 sm:max-w-[320px]">
          <Search
            class="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground"
          />
          <input
            v-model="networkFilter"
            class="peer h-9 w-full rounded-md border border-border bg-background px-2.5 pt-3.5 pr-2.5 pb-1 pl-8 text-xs transition-colors outline-none placeholder:text-transparent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            placeholder=" "
          />
          <span
            class="pointer-events-none absolute top-1 left-8 translate-y-0 text-[10px] leading-none font-medium text-muted-foreground transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-[10px]"
          >
            筛选方法 / ID / 关键词
          </span>
        </label>
        <select
          v-model="statusFilter"
          class="h-8 w-28 rounded-md border border-border bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <option value="all">全部状态</option>
          <option value="pending">等待中</option>
          <option value="success">成功</option>
          <option value="error">错误</option>
          <option value="streaming">推送中</option>
        </select>
        <select
          v-model="kindFilter"
          class="h-8 w-28 rounded-md border border-border bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <option value="all">全部类型</option>
          <option value="call">普通调用</option>
          <option value="subscription">订阅</option>
          <option value="notification">订阅推送</option>
          <option value="raw">原始 WS</option>
        </select>
      </div>

      <div class="flex flex-none flex-wrap items-center gap-1.5">
        <button
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="debugStore.isPaused.value = !debugStore.isPaused.value"
        >
          <Play v-if="debugStore.isPaused.value" class="size-3.5" />
          <Pause v-else class="size-3.5" />
          {{ debugStore.isPaused.value ? "继续" : "暂停" }}
        </button>
        <button
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="debugStore.clear"
        >
          <Trash2 class="size-3.5" />
          清空
        </button>
        <button
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          type="button"
          @click="exportRecords"
        >
          <Download class="size-3.5" />
          导出
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="relative flex min-h-0 flex-auto overflow-hidden">
      <RpcDebugDataTable
        class="flex h-full w-full overflow-hidden"
        :columns="networkColumns"
        :data="filteredRecords"
        empty-text="暂无捕获记录。打开本页后新建的 WebSocket 请求会自动进入列表。"
        :row-key="(record) => record.recordId"
        :row-class="
          (record) =>
            selectedRecord?.recordId === record.recordId ? 'bg-muted/60' : ''
        "
        :on-row-click="selectRecord"
      />
      <RpcNetworkDrawer
        v-if="selectedRecord"
        class="z-10"
        :record="selectedRecord"
        @close="closeDrawer"
        @copy="relayCopy"
        @edit="emit('editRecord', $event)"
      />
    </div>
  </div>
</template>
