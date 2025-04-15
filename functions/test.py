import numpy as np
import matplotlib.pyplot as plt

# x軸の範囲を設定
x = np.linspace(0, 1, 400)

# 正規分布の導関数を計算（x=0.5でy≈0.5となるように調整）
gaussian_derivative = (x**0.8) * (1 - x)**2 * np.exp(-3 * x**2)

# yの最大値を取得
y_max = max(gaussian_derivative)

# 0から1の範囲にスケーリング
gaussian_derivative_scaled = gaussian_derivative / y_max * 2

# Gaussian Derivativeをx軸で反転させる
gaussian_derivative_reflected_x = gaussian_derivative_scaled[::-1]

# グラフを描画
plt.figure(figsize=(10, 6))

# 反転させたGaussian Derivativeをプロット
plt.plot(x, gaussian_derivative_reflected_x, label='Reflected Gaussian Derivative on x-axis', color='red')

plt.axhline(0, color='black', linewidth=0.5)
plt.axvline(0, color='black', linewidth=0.5)

plt.title("Reflected Gaussian Derivative on x-axis")
plt.legend()
plt.grid(True)
plt.show()

# x=0.5のときのyの値を確認
y_at_0_5 = gaussian_derivative_scaled[np.abs(x - 0.5).argmin()]
print("y at x=0.5: ", y_at_0_5)
print("max: ", max(gaussian_derivative_reflected_x))