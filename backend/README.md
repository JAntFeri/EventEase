# Backend setup

## Instalacija podatkovne baze POSTGREs
### 1. Naloži postgres
### 2. V terminalu pojedi v default postgres račun:
    `sudo psql -U postgres`
    geslo:  postgres
### 3. ustvari vlogo admin z geslom admin:
    `CREATE ROLE admin LOGIN password 'admin';`
### 4. Ustvari podatkovno bato EventEaseDB z ownerjem admin 
    `CREATE DATABASE eventeasedb ENCODING 'UTF8' OWNER admin;`
### 5. Prestavi v mapo backend/database in poženi:
    `sudo psql -U admin -d eventeasedb < podatkovna_shema.sql`
    
### 6. 👍


### Preveri če dela
### 1. Logi se in v podatkovno bazo:
    `psql -U admin -d eventeasedb`
### 2. Listi vse tabele:
    `\dt`
    
### 3. Izpis naj bi izgledal tako:
            List of relations
    Schema |     Name     | Type  | Owner 
    --------+--------------+-------+-------
    public | polls        | table | admin
    public | time_slots   | table | admin
    public | vote_options | table | admin
    public | votes        | table | admin
    (4 rows)
    
## Backend setup

### 1. Naloži zig
    https://ziglang.org/learn/getting-started/#direct
### 2. V vsc terminalu 
    `export DATABASE_URL="postgresql://admin:admin@localhost/eventeasedb"`
### 3. Pojdi v mapo kjer je build.zig in zaženi backend z:
    `zig build run`



### Nikolaj backend info
    
## Backend info:
TO JE VERY FINICKY

Fixing it soon(TM)

Anyway ce hoces ka dela moras:

1. Copy podatkovna_shema.db v .../backend/logic/src (ce si kaj posodobil or smth)
2. Dodaj `export DATABASE_URL="postgresql://user:pass@localhost/eventease"` (no idea kak to na windows naredis)
3. Moli

