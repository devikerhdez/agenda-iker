package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	// 1. Registrar usuario
	registerReq := map[string]string{
		"nombre":   "Test User",
		"correo":   "test2@example.com",
		"password": "password123",
		"tema":     "morado",
	}
	body, _ := json.Marshal(registerReq)
	
	resp, err := http.Post("http://localhost:8080/api/register", "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("Error registering: %v\n", err)
	} else {
		fmt.Printf("Register status: %s\n", resp.Status)
		respBody, _ := io.ReadAll(resp.Body)
		fmt.Printf("Register response: %s\n", string(respBody))
		resp.Body.Close()
	}

	// 2. Login para obtener ID
	loginReq := map[string]string{
		"correo":   "test2@example.com",
		"password": "password123",
	}
	body, _ = json.Marshal(loginReq)
	resp, err = http.Post("http://localhost:8080/api/login", "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("Error logging in: %v\n", err)
		return
	}
	
	fmt.Printf("Login status: %s\n", resp.Status)
	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("Login response: %s\n", string(respBody))
	resp.Body.Close()

	var user map[string]interface{}
	json.Unmarshal(respBody, &user)
	userID, ok := user["id"].(string)
	if !ok {
		fmt.Println("No user ID found")
		return
	}

	// 3. Create reminder
	reminderReq := map[string]interface{}{
		"usuario_id": userID,
		"titulo":     "Test Reminder",
		"fecha_hora": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"prioridad":  "muy_alta",
	}
	body, _ = json.Marshal(reminderReq)
	
	req, _ := http.NewRequest("POST", "http://localhost:8080/api/reminders", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("Error creating reminder: %v\n", err)
	} else {
		fmt.Printf("Create reminder status: %s\n", resp.Status)
		respBody, _ = io.ReadAll(resp.Body)
		fmt.Printf("Create reminder response: %s\n", string(respBody))
		resp.Body.Close()
	}

	// 4. Get reminders
	resp, err = http.Get("http://localhost:8080/api/reminders?userId=" + userID)
	if err != nil {
		fmt.Printf("Error getting reminders: %v\n", err)
	} else {
		fmt.Printf("Get reminders status: %s\n", resp.Status)
		respBody, _ = io.ReadAll(resp.Body)
		fmt.Printf("Get reminders response: %s\n", string(respBody))
		resp.Body.Close()
	}
}
