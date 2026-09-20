<?php
namespace App\Services;

class EncryptionService {
    private string $key;
    private string $cipher = 'aes-256-cbc';

    public function __construct(string $key = '') {
        $this->key = $key ?: (defined('APP_ENCRYPTION_KEY') ? APP_ENCRYPTION_KEY : 'default-32-char-key-must-change');
    }

    public function encrypt(string $plainText): string {
        $ivLength = openssl_cipher_iv_length($this->cipher);
        $iv = openssl_random_pseudo_bytes($ivLength);
        $ciphertext = openssl_encrypt($plainText, $this->cipher, $this->key, 0, $iv);
        return base64_encode($iv . $ciphertext);
    }

    public function decrypt(string $encryptedData): ?string {
        $data = base64_decode($encryptedData, true);
        if (!$data) return null;
        $ivLength = openssl_cipher_iv_length($this->cipher);
        $iv = substr($data, 0, $ivLength);
        $ciphertext = substr($data, $ivLength);
        return openssl_decrypt($ciphertext, $this->cipher, $this->key, 0, $iv) ?: null;
    }

    public static function maskSecret(string $secret, int $visibleChars = 4): string {
        if (strlen($secret) <= $visibleChars * 2) {
            return str_repeat('•', 8);
        }
        return substr($secret, 0, $visibleChars) . str_repeat('•', 12) . substr($secret, -$visibleChars);
    }
}
