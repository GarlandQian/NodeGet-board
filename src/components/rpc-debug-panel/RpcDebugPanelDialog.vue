<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSystemSettingsStore } from "@/stores/systemSettings";
import { registerRpcDebugEventHandler } from "./rpcDebugStore";
import RpcDebugPanel from "./RpcDebugPanel.vue";
import Button from "@/components/ui/button/Button.vue";

const DRAG_THRESHOLD_PX = 4;
const FLOATING_BUTTON_MARGIN_PX = 8;

const systemSettingsStore = useSystemSettingsStore();
const open = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);
const buttonPosition = ref<{ x: number; y: number } | null>(null);
const suppressNextClick = ref(false);
const isDragging = ref(false);
let suppressClickTimer: number | undefined;
let unregisterDebugEvents: (() => void) | undefined;
let dragState:
  | {
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      moved: boolean;
    }
  | undefined;

const enabled = computed(() => systemSettingsStore.config.rpcDebugPanelEnabled);

const floatingButtonStyle = computed(() => {
  if (!buttonPosition.value) {
    return {
      right: "1.25rem",
      bottom: "1.25rem",
    };
  }

  return {
    left: `${buttonPosition.value.x}px`,
    top: `${buttonPosition.value.y}px`,
  };
});

watch(enabled, (nextEnabled) => {
  if (!nextEnabled) {
    open.value = false;
    isDragging.value = false;
    dragState = undefined;
  }
});

onMounted(() => {
  window.addEventListener("resize", handleWindowResize);
  unregisterDebugEvents = registerRpcDebugEventHandler();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleWindowResize);
  unregisterDebugEvents?.();
  if (suppressClickTimer != null) window.clearTimeout(suppressClickTimer);
});

function toggleOpen() {
  if (!enabled.value) return;
  open.value = !open.value;
}

function handleFloatingButtonPointerDown(event: PointerEvent) {
  if (!enabled.value) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const element = buttonRef.value;
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const position = constrainFloatingButtonPosition(
    buttonPosition.value ?? {
      x: rect.left,
      y: rect.top,
    },
  );

  buttonPosition.value = position;
  dragState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: position.x,
    startY: position.y,
    moved: false,
  };
  isDragging.value = false;
  element.setPointerCapture(event.pointerId);
}

function handleFloatingButtonPointerMove(event: PointerEvent) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  const deltaX = event.clientX - dragState.startClientX;
  const deltaY = event.clientY - dragState.startClientY;

  if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_PX) {
    dragState.moved = true;
    isDragging.value = true;
  }

  buttonPosition.value = constrainFloatingButtonPosition({
    x: dragState.startX + deltaX,
    y: dragState.startY + deltaY,
  });
}

function handleFloatingButtonPointerEnd(event: PointerEvent) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  const wasDragged = dragState.moved;
  dragState = undefined;
  isDragging.value = false;

  if (buttonRef.value?.hasPointerCapture(event.pointerId)) {
    buttonRef.value.releasePointerCapture(event.pointerId);
  }

  if (wasDragged) suppressClickTemporarily();
}

function handleFloatingButtonClick(event: MouseEvent) {
  if (suppressNextClick.value) {
    event.preventDefault();
    event.stopPropagation();
    suppressNextClick.value = false;
    return;
  }

  toggleOpen();
}

function handleWindowResize() {
  if (!buttonPosition.value) return;
  buttonPosition.value = constrainFloatingButtonPosition(buttonPosition.value);
}

function constrainFloatingButtonPosition(position: { x: number; y: number }) {
  const element = buttonRef.value;
  const width = element?.offsetWidth ?? 72;
  const height = element?.offsetHeight ?? 44;
  const maxX = Math.max(
    FLOATING_BUTTON_MARGIN_PX,
    window.innerWidth - width - FLOATING_BUTTON_MARGIN_PX,
  );
  const maxY = Math.max(
    FLOATING_BUTTON_MARGIN_PX,
    window.innerHeight - height - FLOATING_BUTTON_MARGIN_PX,
  );

  return {
    x: clamp(position.x, FLOATING_BUTTON_MARGIN_PX, maxX),
    y: clamp(position.y, FLOATING_BUTTON_MARGIN_PX, maxY),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function suppressClickTemporarily() {
  suppressNextClick.value = true;
  if (suppressClickTimer != null) window.clearTimeout(suppressClickTimer);
  suppressClickTimer = window.setTimeout(() => {
    suppressNextClick.value = false;
    suppressClickTimer = undefined;
  }, 250);
}
</script>

<template>
  <button
    v-if="enabled"
    ref="buttonRef"
    type="button"
    class="fixed z-[60] inline-flex h-11 touch-none select-none items-center gap-2 rounded-full border bg-background/95 px-4 text-sm font-medium shadow-lg backdrop-blur transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
    :style="floatingButtonStyle"
    :aria-expanded="open"
    aria-controls="rpc-debug-panel-dialog"
    title="RPC 调试面板"
    @click="handleFloatingButtonClick"
    @pointerdown="handleFloatingButtonPointerDown"
    @pointermove="handleFloatingButtonPointerMove"
    @pointerup="handleFloatingButtonPointerEnd"
    @pointercancel="handleFloatingButtonPointerEnd"
  >
    <span
      class="h-2.5 w-2.5 rounded-full"
      :class="open ? 'bg-emerald-500' : 'bg-primary'"
    />
    RPC
  </button>

  <Dialog v-if="enabled" :open="open" @update:open="open = $event">
    <DialogContent
      id="rpc-debug-panel-dialog"
      class="flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] flex-col gap-3 overflow-hidden p-3 sm:max-w-[calc(100vw-3rem)] md:h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)] md:w-[calc(100vw-4rem)] md:max-w-[calc(100vw-4rem)] md:p-4"
      :show-close-button="false"
    >
      <DialogHeader
        class="flex flex-none flex-row items-center justify-between gap-3 space-y-0"
      >
        <div class="min-w-0">
          <DialogTitle class="text-sm">RPC 调试面板</DialogTitle>
          <DialogDescription class="text-xs">
            点击遮罩或按 Esc 关闭
          </DialogDescription>
        </div>
        <Button
          variant="destructive"
          class="inline-flex h-8 items-center rounded-md border px-3 text-sm transition hover:bg-muted"
          @click="open = false"
        >
          关闭
        </Button>
      </DialogHeader>

      <RpcDebugPanel />
    </DialogContent>
  </Dialog>
</template>
