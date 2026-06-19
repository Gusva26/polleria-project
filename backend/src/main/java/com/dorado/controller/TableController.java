package com.dorado.controller;

import com.dorado.exception.ResourceNotFoundException;
import com.dorado.model.RestaurantTable;
import com.dorado.repository.RestaurantTableRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/tables")
@CrossOrigin(origins = "*")
public class TableController {

    private final RestaurantTableRepository tableRepository;

    public TableController(RestaurantTableRepository tableRepository) {
        this.tableRepository = tableRepository;
    }

    @GetMapping
    public List<RestaurantTable> getAllTables() {
        return tableRepository.findAllByOrderByTableNumberAsc();
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MESERO')")
    public ResponseEntity<RestaurantTable> createTable(@RequestBody RestaurantTable table) {
        if (table.getStatus() == null) {
            table.setStatus("AVAILABLE");
        }
        return ResponseEntity.ok(tableRepository.save(table));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MESERO')")
    public ResponseEntity<RestaurantTable> updateTable(@PathVariable Long id, @RequestBody RestaurantTable details) {
        return tableRepository.findById(id).map(table -> {
            table.setTableNumber(details.getTableNumber());
            table.setCapacity(details.getCapacity());
            if (details.getStatus() != null) {
                table.setStatus(details.getStatus().toUpperCase());
            }
            return ResponseEntity.ok(tableRepository.save(table));
        }).orElseThrow(() -> new ResourceNotFoundException("Mesa", "id", id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        return tableRepository.findById(id).map(table -> {
            tableRepository.delete(table);
            return ResponseEntity.ok().<Void>build();
        }).orElseThrow(() -> new ResourceNotFoundException("Mesa", "id", id));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MESERO')")
    public ResponseEntity<RestaurantTable> updateTableStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        return tableRepository.findById(id).map(table -> {
            table.setStatus(status.toUpperCase());
            return ResponseEntity.ok(tableRepository.save(table));
        }).orElseThrow(() -> new ResourceNotFoundException("Mesa", "id", id));
    }
}
