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

:global(html),
:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent !important;
}
</style>
