// Tiny native helper: estimate a sensible starting video bitrate for a local call.
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <string>
int main(int argc, char** argv) {
  int width = argc > 1 ? std::atoi(argv[1]) : 1920;
  int height = argc > 2 ? std::atoi(argv[2]) : 1080;
  int fps = argc > 3 ? std::atoi(argv[3]) : 60;
  double scale = (static_cast<double>(width) * height * std::clamp(fps, 15, 60)) / (1920.0 * 1080 * 60);
  int kbps = static_cast<int>(std::clamp(5500.0 * scale, 700.0, 8000.0));
  std::cout << "Starting WebRTC video bitrate: " << kbps << " kbps\n";
  return 0;
}
