class QuestCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.count = 0;
    this.done = false;
    this.port.onmessage = () => this.finish();
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.port.postMessage({ done: true });
  }
  process(inputs, outputs) {
    for (const channel of outputs[0] || []) channel.fill(0);
    if (this.done) return false;
    const channels = inputs[0];
    if (channels?.length) {
      const size = Math.min(channels[0].length, sampleRate * 20 - this.count);
      const mono = new Float32Array(size);
      for (const channel of channels)
        for (let i = 0; i < size; i++) mono[i] += channel[i] / channels.length;
      this.count += size;
      this.port.postMessage({ samples: mono }, [mono.buffer]);
      if (this.count >= sampleRate * 20) this.finish();
    }
    return !this.done;
  }
}
registerProcessor("quest-capture", QuestCapture);
