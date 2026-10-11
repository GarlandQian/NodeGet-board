<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Badge } from "@/components/ui/badge";
import { getVersionChannel, isOlderVersion } from "@/utils/nodeVersion";

// 节点版本旁的标记：nightly、预发布节点显示来源，比最新正式版旧的显示"可更新"
const props = defineProps<{
  /** 节点的版本号，保留 -rc.1、-nightly.… 这类后缀，不含提交号 */
  version: string;
  /** 最新的正式版版本号 */
  latest: string;
}>();

const { t } = useI18n();

const channel = computed(() => getVersionChannel(props.version));
// 带后缀的版本比同号的正式版旧，所以同号的 nightly、rc 也会显示"可更新"
const outdated = computed(() => isOlderVersion(props.version, props.latest));
</script>

<template>
  <Badge
    v-if="channel === 'nightly'"
    variant="outline"
    class="ml-2 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
    >{{ t("common.channelNightly") }}</Badge
  >
  <Badge
    v-else-if="channel === 'prerelease'"
    variant="outline"
    class="ml-2 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
    >{{ t("common.channelPrerelease") }}</Badge
  >
  <Badge
    v-if="outdated"
    variant="outline"
    class="ml-2 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    >{{ t("common.updatable") }}</Badge
  >
  <!-- 数字比最新正式版还大的 nightly 不算"最新版本"，只显示它的来源标记 -->
  <Badge
    v-else-if="channel === 'stable'"
    variant="outline"
    class="ml-2 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
    >{{ t("common.latestVersion") }}</Badge
  >
</template>
