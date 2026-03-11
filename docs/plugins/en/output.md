# Output

Blocks for outputting the signal outside the processing graph.

---

## Speaker

**ID:** `speaker` | **Group:** output | **Input:** real | **Output:** null (terminal block)

### Purpose

Plays the input signal through the computer's audio system (speakers or headphones). The final block in the processing chain for listening to synthesized tones, demodulated signals, filtering effects, and other audio results.

### Algorithm

The block is transparent (passthrough): it returns the input array without modification (or silence when muted). Actual playback is performed by DSPProcessor via the Web Audio API (AudioWorklet or ScriptProcessorNode). Only one Speaker block can exist in a graph.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| muted | boolean | false | Mute audio. When true — silence (array of zeros). |

### Usage Examples

1. **Playing a tone:**
   `Sine(440) -> Speaker` — the note A4 (440 Hz). It is recommended to start at low volume!

2. **Listening to filtered output:**
   `AudioFile(music.wav) -> NotchFIR(50 Hz) -> Speaker` — plays back with 50 Hz hum suppressed.

3. **Demodulation and listening:**
   `AMFMPMModulator(FM) -> FrequencyDiscriminator -> Speaker` — recovers the modulating signal.

### Warning

Signal amplitude should be within [-1, +1]. Values outside this range will cause clipping (distortion). Use the Gain block for scaling before feeding to Speaker.
