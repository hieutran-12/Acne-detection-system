import { useEffect, useRef, useState } from 'react';

function explain(e) {
  if (!navigator.mediaDevices?.getUserMedia)
    return 'Trình duyệt chỉ cho mở camera trên trang HTTPS. Hãy mở bằng địa chỉ https:// (hoặc localhost).';
  if (e.name === 'NotAllowedError') return 'Bạn đã chặn quyền camera. Cho phép camera trong cài đặt trình duyệt rồi thử lại.';
  if (e.name === 'NotFoundError') return 'Không tìm thấy camera trên thiết bị này.';
  if (e.name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng.';
  return 'Không mở được camera: ' + (e.message || e.name);
}

export function useCamera(videoRef, { on, facing, deviceId }) {
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [dims, setDims] = useState(null);
  const [mirror, setMirror] = useState(true);
  const track = useRef(null);

  useEffect(() => {
    if (!on) return;
    let stream;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
        // Xin độ phân giải cao nhất camera hỗ trợ: model cần ảnh chi tiết, khung 720p dễ bỏ sót mụn nhỏ
        const size = { width: { ideal: 4096 }, height: { ideal: 3072 } };
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: facing, ...size },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        track.current = stream.getVideoTracks()[0];
        setDims({ w: v.videoWidth, h: v.videoHeight });
        setMirror(track.current.getSettings().facingMode !== 'environment');
        setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'));
        setError('');
      } catch (e) {
        if (!cancelled) setError(explain(e));
      }
    })();
    return () => {
      cancelled = true;
      track.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on, facing, deviceId, videoRef]);

  return { error, devices, dims, mirror, track };
}
