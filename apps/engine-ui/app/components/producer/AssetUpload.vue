<script setup lang="ts">
const emit = defineEmits<{
  upload: [file: File];
}>();

const dragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const error = ref<string | null>(null);

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: PNG, JPEG, GIF, WebP, SVG.`;
  }
  if (file.size > MAX_SIZE) {
    return `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum: 10 MB.`;
  }
  return null;
}

function handleFiles(files: FileList | null) {
  error.value = null;
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    const validationError = validateFile(files[i]);
    if (validationError) {
      error.value = validationError;
      return;
    }
    emit('upload', files[i]);
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false;
  handleFiles(event.dataTransfer?.files ?? null);
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  handleFiles(target.files);
  target.value = '';
}
</script>

<template>
  <div>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
      :class="dragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'"
      @drop.prevent="handleDrop"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @click="openFilePicker"
    >
      <UIcon name="i-lucide-upload-cloud" class="text-3xl text-gray-400 mb-2" />
      <p class="text-sm font-medium">Drop files here or click to browse</p>
      <p class="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, SVG up to 10 MB</p>
    </div>

    <p v-if="error" class="text-sm text-red-500 mt-2">{{ error }}</p>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
      multiple
      class="hidden"
      @change="handleInputChange"
    />
  </div>
</template>
