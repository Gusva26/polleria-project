package com.dorado;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import java.io.File;

@SpringBootApplication
@EnableAsync
public class BackendApplication {
    public static void main(String[] args) {
        // Find .env file starting from current directory up to parent directories if needed
        File envFile = findDotenvFile(new File(".").getAbsoluteFile());
        Dotenv dotenv;
        if (envFile != null) {
            dotenv = Dotenv.configure().directory(envFile.getParent()).ignoreIfMissing().load();
        } else {
            dotenv = Dotenv.configure().ignoreIfMissing().load();
        }
        
        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });

        SpringApplication.run(BackendApplication.class, args);
    }

    private static File findDotenvFile(File currentDir) {
        if (currentDir == null) return null;
        File file = new File(currentDir, ".env");
        if (file.exists() && file.isFile()) {
            return file;
        }
        return findDotenvFile(currentDir.getParentFile());
    }
}
