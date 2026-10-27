import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Mic, Palette, Settings, Shield, Volume2, X } from 'lucide-react';

export default function SettingsModal({ name, setName, preferences, setPreferences, onClose, onNotice }) {
  const [devices, setDevices] = useState([]);
  const [draft, setDraft] = useState(name);
  const [micStream, setMicStream] = useState(null);
  const [micTesting, setMicTesting] = useState(false);
  const [outputTesting, setOutputTesting] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const canvas = useRef(null);
  const audioElement = useRef(null);
  const outputContext = useRef(null);
  const outputTimer = useRef(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices?.enumerateDevices?.() || [];
      setDevices(list);
    } catch {
      setDeviceError('Não foi possível consultar os dispositivos neste navegador.');
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    const refresh = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
  }, [enumerateDevices]);

  useEffect(() => {
    if (!micStream || !canvas.current) return undefined;
    let frame = 0;
    let context;
    let source;
    let analyser;
    let alive = true;
    const element = canvas.current;
    const ctx = element.getContext('2d');
    const samples = new Uint8Array(128);
    (async () => {
      try {
        context = new AudioContext();
        await context.resume();
        source = context.createMediaStreamSource(micStream);
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const draw = () => {
          if (!alive) return;
          frame = requestAnimationFrame(draw);
          analyser.getByteTimeDomainData(samples);
          const w = element.width;
          const h = element.height;
          ctx.clearRect(0, 0, w, h);
          ctx.strokeStyle = '#ffffff0c';
          ctx.lineWidth = 1;
          for (let y = 15; y < h; y += 15) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }
          ctx.beginPath();
          for (let i = 0; i < samples.length; i++) {
            const x = i * w / (samples.length - 1);
            const y = (samples[i] / 255) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.strokeStyle = '#bd72fa';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#a142f2';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        };
        draw();
      } catch {
        setDeviceError('Não foi possível iniciar o medidor do microfone.');
      }
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      source?.disconnect();
      context?.close().catch(() => {});
    };
  }, [micStream]);

  const update = (key, value) => setPreferences(p => ({ ...p, [key]: value }));
  const stopMicTest = () => {
    micStream?.getTracks().forEach(track => track.stop());
    setMicStream(null);
    setMicTesting(false);
  };
  const startMicTest = async () => {
    setDeviceError('');
    stopMicTest();
    try {
      const audio = {
        echoCancellation: preferences.echoCancellation,
        noiseSuppression: preferences.noiseSuppression,
        autoGainControl: true,
        ...(preferences.inputDevice ? { deviceId: { exact: preferences.inputDevice } } : {}),
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      setMicStream(stream);
      setMicTesting(true);
      await enumerateDevices();
      setDeviceError('Fale perto do microfone: o gráfico deve reagir à sua voz.');
    } catch (e) {
      setMicTesting(false);
      setDeviceError(e.name === 'NotAllowedError'
        ? 'Permita o acesso ao microfone nas permissões do navegador e tente novamente.'
        : 'Não foi possível abrir este microfone. Confira se outro aplicativo está usando-o.');
    }
  };
  const enableDeviceNames = async () => {
    setDeviceError('');
    try {
      const temporary = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      temporary.getTracks().forEach(track => track.stop());
      await enumerateDevices();
      setDeviceError('Dispositivos atualizados. Agora os nomes devem aparecer nas listas.');
    } catch (e) {
      setDeviceError(e.name === 'NotAllowedError'
        ? 'Permita o acesso ao microfone no navegador para descobrir os dispositivos.'
        : 'Não foi possível consultar o microfone. Verifique a conexão do dispositivo.');
    }
  };
  const testOutput = async () => {
    if (outputTesting) {
      clearTimeout(outputTimer.current);
      outputContext.current?.close().catch(() => {});
      outputContext.current = null;
      setOutputTesting(false);
      return;
    }
    setDeviceError('');
    try {
      const context = new AudioContext();
      await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const destination = context.createMediaStreamDestination();
      const audio = audioElement.current;
      oscillator.frequency.value = 660;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0, context.currentTime);
      for (let i = 0; i < 3; i++) {
        const start = context.currentTime + .12 + i * .42;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.12, start + .025);
        gain.gain.setValueAtTime(.12, start + .18);
        gain.gain.linearRampToValueAtTime(0, start + .22);
      }
      oscillator.connect(gain).connect(destination);
      audio.srcObject = destination.stream;
      if (preferences.outputDevice && audio.setSinkId) await audio.setSinkId(preferences.outputDevice);
      await audio.play();
      oscillator.start();
      outputContext.current = context;
      setOutputTesting(true);
      outputTimer.current = setTimeout(() => {
        oscillator.stop();
        context.close().catch(() => {});
        outputContext.current = null;
        setOutputTesting(false);
      }, 1700);
    } catch {
      setDeviceError('Não foi possível tocar o som de teste nesta saída de áudio.');
      setOutputTesting(false);
    }
  };
  useEffect(() => () => {
    micStream?.getTracks().forEach(track => track.stop());
    clearTimeout(outputTimer.current);
    outputContext.current?.close().catch(() => {});
  }, [micStream]);

  const save = e => {
    e.preventDefault();
    const nextName = draft.trim().slice(0, 32);
    if (!nextName) return;
    localStorage.setItem('community-name', nextName);
    setName(nextName);
    onNotice('Perfil atualizado.');
    onClose();
  };
  const named = (device, kind, index) => device.label || `${kind} ${index + 1}`;
  const inputs = devices.filter(d => d.kind === 'audioinput');
  const outputs = devices.filter(d => d.kind === 'audiooutput');
  const cameras = devices.filter(d => d.kind === 'videoinput');

  return <div className="modal-backdrop settings-backdrop" onClick={onClose}>
    <section className="settings-modal" onClick={e => e.stopPropagation()}>
      <aside className="settings-nav">
        <div className="settings-title">Configurações</div>
        <button className="settings-navitem current" onClick={() => document.getElementById('settings-account')?.scrollIntoView({ behavior: 'smooth' })}><Settings size={16}/> Minha conta</button>
        <button className="settings-navitem" onClick={() => document.getElementById('settings-appearance')?.scrollIntoView({ behavior: 'smooth' })}><Palette size={16}/> Aparência</button>
        <button className="settings-navitem" onClick={() => document.getElementById('settings-voice')?.scrollIntoView({ behavior: 'smooth' })}><Volume2 size={16}/> Voz e vídeo</button>
        <button className="settings-navitem" onClick={() => document.getElementById('settings-notifications')?.scrollIntoView({ behavior: 'smooth' })}><Bell size={16}/> Notificações</button>
        <button className="settings-navitem" onClick={() => document.getElementById('settings-privacy')?.scrollIntoView({ behavior: 'smooth' })}><Shield size={16}/> Privacidade</button>
        <div className="settings-navfoot">Nuvora · privado na rede local</div>
      </aside>
      <div className="settings-content">
        <button type="button" className="modal-close" onClick={onClose}><X size={18}/></button>
        <div id="settings-account" className="settings-overline">MINHA CONTA</div><h2>Seu perfil</h2><p>Escolha como as pessoas da comunidade veem você.</p>
        <form onSubmit={save}>
          <label>NOME DE EXIBIÇÃO</label><input className="setting-input" maxLength="32" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Seu nome"/>
          <label>STATUS</label><select className="setting-input" value={preferences.status} onChange={e => update('status', e.target.value)}><option>Disponível</option><option>Ausente</option><option>Não perturbe</option><option>Invisível</option></select>
          <div className="settings-divider"/><div id="settings-appearance" className="settings-overline">APARÊNCIA</div><label>TEMA</label>
          <div className="theme-picker">{[['dark','Escuro'],['amoled','Preto'],['light','Claro']].map(([id,label]) => <button type="button" key={id} className={preferences.theme === id ? 'theme-choice chosen' : 'theme-choice'} onClick={() => update('theme', id)}><span className={'theme-swatch '+id}/>{label}{preferences.theme === id && <Check size={14}/>}</button>)}</div>
          <label className="toggle-row"><span><b>Modo compacto</b><small>Mostra mais mensagens na tela.</small></span><input type="checkbox" checked={preferences.compact} onChange={e => update('compact', e.target.checked)}/></label>
          <div className="settings-divider"/><div id="settings-voice" className="settings-overline">VOZ E VÍDEO</div>
          <div className="device-section-head"><div><b>Microfone</b><small>Escolha e teste a entrada de voz.</small></div><button type="button" className="device-refresh" onClick={enableDeviceNames}><Mic size={14}/> Ativar e atualizar</button></div>
          <label>DISPOSITIVO DE ENTRADA</label><select className="setting-input" value={preferences.inputDevice} onChange={e => update('inputDevice', e.target.value)}><option value="">Padrão do sistema</option>{inputs.map((d,i) => <option key={d.deviceId} value={d.deviceId}>{named(d, 'Microfone', i)}</option>)}</select>
          <div className="device-test-card"><div className="device-test-title"><span>Medidor de entrada</span><span className={micTesting ? 'device-live' : 'device-idle'}>{micTesting ? 'AO VIVO' : 'PRONTO'}</span></div><canvas className="audio-visualizer" ref={canvas} width="600" height="72" aria-label="Gráfico do nível do microfone"/><div className="device-test-actions"><small>{micTesting ? 'Fale para testar o nível do microfone.' : 'O gráfico reage quando o microfone capta som.'}</small><button type="button" className={micTesting ? 'device-test-button stop' : 'device-test-button'} onClick={micTesting ? stopMicTest : startMicTest}>{micTesting ? 'Parar teste' : 'Testar microfone'}</button></div></div>
          <div className="device-section-head output-head"><div><b>Saída de áudio</b><small>Ouça um tom curto na saída selecionada.</small></div><button type="button" className="device-test-button" onClick={testOutput}>{outputTesting ? 'Parar som' : 'Testar saída'}</button></div>
          <label>DISPOSITIVO DE SAÍDA</label><select className="setting-input" value={preferences.outputDevice} onChange={e => update('outputDevice', e.target.value)}><option value="">Padrão do sistema</option>{outputs.map((d,i) => <option key={d.deviceId} value={d.deviceId}>{named(d, 'Saída de áudio', i)}</option>)}</select>
          <audio ref={audioElement} className="audio-test-element" aria-hidden="true"/>
          <label>CÂMERA</label><select className="setting-input" value={preferences.cameraDevice} onChange={e => update('cameraDevice', e.target.value)}><option value="">Padrão do sistema</option>{cameras.map((d,i) => <option key={d.deviceId} value={d.deviceId}>{named(d, 'Câmera', i)}</option>)}</select>
          <label className="toggle-row"><span><b>Cancelamento de eco</b><small>Reduz o retorno do áudio da chamada.</small></span><input type="checkbox" checked={preferences.echoCancellation} onChange={e => update('echoCancellation', e.target.checked)}/></label>
          <label className="toggle-row"><span><b>Redução de ruído</b><small>Filtra sons constantes do ambiente.</small></span><input type="checkbox" checked={preferences.noiseSuppression} onChange={e => update('noiseSuppression', e.target.checked)}/></label>
          {deviceError && <div className="device-feedback" role="status">{deviceError}</div>}
          <button type="button" className="device-refresh refresh-bottom" onClick={enumerateDevices}>Atualizar lista de dispositivos</button>
          <div className="settings-divider"/><div id="settings-notifications" className="settings-overline">NOTIFICAÇÕES</div>
          <label className="toggle-row"><span><b>Notificações do navegador</b><small>Permite avisos quando a janela não está ativa.</small></span><input type="checkbox" checked={preferences.notifications} onChange={async e => { let enabled = e.target.checked; if (enabled && 'Notification' in window && Notification.permission === 'default') enabled = await Notification.requestPermission() === 'granted'; if (enabled && 'Notification' in window && Notification.permission === 'denied') enabled = false; update('notifications', enabled); if (!enabled) onNotice('Notificações não foram ativadas neste navegador.'); }}/></label>
          <div id="settings-privacy" className="settings-privacy"><Shield size={15}/> Esta instalação não tem contas ou criptografia ponta a ponta. Compartilhe o endereço apenas com pessoas de confiança.</div>
          <div className="settings-save"><button type="button" className="cancel" onClick={onClose}>Fechar</button><button className="primary" type="submit" disabled={!draft.trim()}><Check size={15}/> Salvar perfil</button></div>
        </form>
      </div>
    </section>
  </div>;
}
