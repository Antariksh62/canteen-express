import { useState, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000';

export default function TeacherView() {
  const [orderText, setOrderText] = useState('');
  const [destination, setDestination] = useState('CS_Dept_Staffroom');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const triggerSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setOrderText('');
    }, 4000);
  };

  // --- TEXT SUBMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderText) return;
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/orders`, { orderText, destination });
      triggerSuccess();
    } catch (err) {
      alert("Failed to place text order.");
    }
    setLoading(false);
  };

  // --- VOICE RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Please allow microphone access to use voice ordering.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder.current) return;

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      await sendVoiceOrder(audioBlob);
    };

    mediaRecorder.current.stop();
    setIsRecording(false);

    // Stop all audio tracks to release the mic
    mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
  };

  const sendVoiceOrder = async (audioBlob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'order.webm');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update the text area with what the AI heard
      setOrderText(response.data.text);

      // REMOVE triggerSuccess() from here! 
      // We want the teacher to see the text and then manually click 'Send Text Order'
    } catch (err) {
      console.error(err);
      alert("Failed to transcribe. Please try typing or speak clearer.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white rounded-xl shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">☕ CanteenExpress</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Deliver To:</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="CS_Dept_Staffroom">CS Dept Staffroom</option>
            <option value="IT_Dept_Staffroom">IT Dept Staffroom</option>
            <option value="HOD_Cabin">HOD Cabin</option>
          </select>
        </div>

        {/* VOICE BUTTON */}
        <div className="flex flex-col items-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${isRecording
              ? 'bg-red-500 animate-pulse scale-110 shadow-lg shadow-red-200'
              : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200'
              }`}
          >
            <span className="text-white font-bold text-center leading-tight">
              {isRecording ? 'Listening...' : 'Hold to\nTalk'}
            </span>
          </button>
          <p className="text-xs text-gray-500 mt-4 font-medium">
            Hold the button, say your order, and release.
          </p>
        </div>

        <div className="flex items-center text-gray-400 font-medium text-sm">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-3">OR TYPE IT</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* TEXT INPUT FALLBACK */}
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., 'Get me 2 coffees and a samosa'"
            value={orderText}
            onChange={(e) => setOrderText(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || isRecording}
            className="w-full mt-3 bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Processing via AI...' : 'Send Text Order'}
          </button>
        </form>
      </div>

      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-center text-sm font-bold shadow-sm">
          Order sent to canteen instantly! 🚀
        </div>
      )}
    </div>
  );
}