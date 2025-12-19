using BCrypt.Net;

if (args.Length == 0)
{
    Console.WriteLine("Usage: dotnet run <password>");
    return;
}

var password = args[0];
var hash = BCrypt.Net.BCrypt.HashPassword(password, 11);
Console.WriteLine($"Password: {password}");
Console.WriteLine($"Hash: {hash}");
