# Phase 2: car display (music + car stats)

**Status: not started.** Phase 1 is the music app on iPhone only. This page records what we already know,
so phase 2 starts from facts rather than from scratch.

The goal is a screen in the 2012 Honda Pilot that is the only place showing both the music app and live car
stats. The hardware isn't decided. The leading option is an **Android head unit**, so nothing here should
assume a particular platform.

## What carries over from phase 1

- **The music app itself.** It's a web app, so it runs in Chrome on Android, can be installed from Chrome, or
  can be wrapped as a full-screen Android app (Trusted Web Activity or Capacitor).
- **Car mode** (`/car`) is already a large-control, landscape-friendly layout. In phase 2 it gains a stats strip
  and a separate stats screen.
- **The music server.** The head unit can reach the same server over the internet (e.g. Tailscale), or keep a
  local copy of the library for driving without signal. Offline downloads in phase 1 would cover this too.

## Head unit options to compare

| Option | Pros | Cons |
| --- | --- | --- |
| Android head unit (replaces the stereo) | Built-in screen and audio, so there's no AUX or Bluetooth gap; it powers on with the car | Needs a dash kit and wiring harness for the Pilot; steering-wheel controls usually need an SWC adapter; unit quality varies a lot |
| Android tablet in a dash mount | Cheap, nothing to install in the dash | Audio still goes through AUX/Bluetooth; heat and power management |
| Single-board computer + touchscreen (e.g. Raspberry Pi) | Full control, can run a local service | Most DIY work: power, safe shutdown, and the Pi 5 has no headphone jack |

## Getting car stats (OBD-II)

Facts about the car:

- The OBD-II port is under the dash on the driver's side.
- The 2012 Pilot uses CAN (ISO 15765-4), which any ELM327-compatible adapter speaks.
- Older Hondas often don't report fuel level or control-module voltage (PID 0x42). The adapter's own
  battery reading (`AT RV`) is a reliable fallback for voltage.
- Honda-only data, such as transmission temperature, needs Honda's enhanced PIDs. Leave that for later.
- Read trouble codes only. Don't clear them from the app, because clearing also resets the emissions
  readiness monitors.

How the adapter connects decides the architecture, so pick the adapter and platform together:

- **Chrome on Android** can only use **Bluetooth LE** adapters, through Web Bluetooth. Classic-Bluetooth (SPP)
  ELM327 adapters are not reachable from a web page. BLE adapters exist, e.g. OBDLink CX and Vgate iCar Pro BLE.
- **A wrapped Android app (Capacitor)** can use a native plugin for classic Bluetooth or USB serial, which
  works with almost any adapter.
- **A computer-based unit** can run a small local service that talks to the adapter over USB or Bluetooth and
  streams readings to the web app over a WebSocket.

## Stats worth showing

- Read every cycle: speed, RPM, throttle position, engine load.
- Read less often: coolant temperature, intake and outside air temperature, fuel level (if the car supports
  it), battery voltage, mass air flow, timing advance, short- and long-term fuel trims, engine run time.
- Show only values the car reports as supported. Show "—" for everything else.

## Open decisions

1. Which hardware: Android head unit, tablet, or something else.
2. Which OBD adapter, which follows from (1). Use BLE if staying a pure web app.
3. Whether music on the car display streams from the home server or uses a local copy.
