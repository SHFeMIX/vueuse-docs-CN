<script setup lang="ts">
import { interval } from 'rxjs'
import { ref } from 'vue'
import { useSubscription } from '.'

const count = ref(0)
useSubscription(
  interval(1000)
    .subscribe(() => {
      count.value++
    }),
)
</script>

<template>
  <note>每1s更新一次</note>
  <p>Counter: {{ count }}</p>
</template>
