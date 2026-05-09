using System.Reflection;
using System.Text.Json.Serialization;
using DeepLens.Contracts.Tenants;
using NetArchTest.Rules;
using Xunit;

namespace DeepLens.ArchitectureTests;

public class DtoTests
{
    private static readonly Assembly ContractsAssembly = typeof(CreateTenantRequest).Assembly;

    [Fact]
    public void AllPublicPropertiesInContractsShouldHaveJsonPropertyNameAttribute()
    {
        // Arrange & Act
        var result = Types.InAssembly(ContractsAssembly)
            .That()
            .ArePublic()
            .And()
            .AreNotInterfaces()
            .And()
            .AreNotAbstract()
            .Should()
            .MeetCustomRule(new PublicPropertiesHaveJsonPropertyNameAttributeRule())
            .GetResult();

        // Assert
        if (!result.IsSuccessful)
        {
            var failingTypes = string.Join(", ", result.FailingTypeNames ?? Array.Empty<string>());
            Assert.True(result.IsSuccessful, $"The following types have public properties missing [JsonPropertyName]: {failingTypes}");
        }
    }

    private class PublicPropertiesHaveJsonPropertyNameAttributeRule : ICustomRule
    {
        public bool MeetsRule(Mono.Cecil.TypeDefinition type)
        {
            // Only check classes that look like DTOs (Records or Classes with public properties)
            // We exclude some internal or compiler-generated types if necessary
            if (type.Name.Contains("<") || type.Name.Contains("__")) return true;

            foreach (var property in type.Properties)
            {
                // We check for public instance properties
                // Mono.Cecil doesn't have a direct "IsPublic" for properties like System.Reflection
                // We check the getter or setter
                var isPublic = (property.GetMethod?.IsPublic ?? false) || (property.SetMethod?.IsPublic ?? false);
                
                if (isPublic)
                {
                    var hasAttribute = property.CustomAttributes
                        .Any(a => a.AttributeType.Name == "JsonPropertyNameAttribute" || a.AttributeType.Name == "JsonIgnoreAttribute");

                    if (!hasAttribute)
                    {
                        // Ignore static properties
                        var getter = property.GetMethod;
                        var setter = property.SetMethod;
                        if ((getter != null && getter.IsStatic) || (setter != null && setter.IsStatic))
                        {
                            continue;
                        }

                        return false;
                    }

                    // Optional: Check if the value is camelCase
                    var jsonAttribute = property.CustomAttributes
                        .FirstOrDefault(a => a.AttributeType.Name == "JsonPropertyNameAttribute");
                    
                    if (jsonAttribute != null)
                    {
                        var jsonName = jsonAttribute.ConstructorArguments[0].Value?.ToString();
                        if (string.IsNullOrEmpty(jsonName) || !char.IsLower(jsonName[0]))
                        {
                            // return false; // Enforce camelCase here if desired
                        }
                    }
                }
            }

            return true;
        }
    }
}
