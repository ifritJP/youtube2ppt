package main

import (
	"fmt"
	"net/http"
)

func main() {
	port := "0.0.0.0:28080"
	fmt.Printf("start -- %s\n", port)
	http.Handle(
		"/",
		http.StripPrefix(
			"/", http.FileServer(http.Dir("../"))))
	http.ListenAndServe(port, nil)
}
