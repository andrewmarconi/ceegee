<template>
  <div class="overlay-layout">
    <slot />
  </div>
</template>

<style scoped>
.overlay-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}
</style>
